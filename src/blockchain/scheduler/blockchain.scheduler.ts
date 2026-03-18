import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WalletService, MAX_CREATION_RETRIES } from '../services/wallet.service';
import { BlockchainTransactionService } from '../services/blockchain-transaction.service';
import { BlockchainService } from '../services/blockchain.service';

@Injectable()
export class BlockchainScheduler {
  private readonly logger = new Logger(BlockchainScheduler.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly blockchainTxService: BlockchainTransactionService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Retry PENDING wallet creations every 2 minutes.
   *
   * A wallet is PENDING when the initial createWallet() contract call failed
   * (network error, gas spike, node timeout). The scheduler retries until
   * the wallet becomes ACTIVE or MAX_CREATION_RETRIES is reached.
   *
   * If max retries are exceeded, the wallet is left PENDING and an error
   * is logged for manual intervention. In production, wire this to PagerDuty
   * or Slack via your alerting infrastructure.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPendingWallets(): Promise<void> {
    const pendingWallets = await this.walletService.findPendingWallets();

    if (pendingWallets.length === 0) return;

    this.logger.log(`Scheduler: retrying ${pendingWallets.length} pending wallet(s)`);

    const platformAddress = this.blockchainService.getSignerAddress();

    for (const wallet of pendingWallets) {
      if (wallet.retryCount >= MAX_CREATION_RETRIES) {
        // Alert and skip — do not attempt further
        this.logger.error(
          `ALERT: Wallet creation exceeded max retries [userId=${wallet.userId}]` +
          ` [retries=${wallet.retryCount}] — manual intervention required`,
        );
        continue;
      }

      try {
        await this.walletService.retryWalletCreation(wallet.id, platformAddress);
      } catch (err) {
        // Log per-wallet errors but continue processing the rest
        this.logger.error(
          `Scheduler retry failed [walletId=${wallet.id}] [userId=${wallet.userId}]`,
          err,
        );
      }
    }
  }

  /**
   * Check for stuck SUBMITTED transactions every 10 minutes.
   *
   * A transaction is "stuck" if it has been in SUBMITTED status for more than
   * 15 minutes — it should have been mined by now (most chains: ~seconds to ~minutes).
   * This indicates a dropped transaction, nonce gap, or gas underpricing.
   *
   * In production: re-submit with higher gas (speed-up tx) or cancel and re-queue.
   * Here we log for manual review.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async alertOnStuckTransactions(): Promise<void> {
    const stuckTxs = await this.blockchainTxService.findStuckSubmissions(15);

    if (stuckTxs.length === 0) return;

    this.logger.warn(
      `ALERT: ${stuckTxs.length} blockchain transaction(s) stuck in SUBMITTED for >15min:`,
    );

    for (const tx of stuckTxs) {
      this.logger.warn(
        `  [id=${tx.id}] [type=${tx.txType}] [ref=${tx.appReference}]` +
        ` [txHash=${tx.txHash}] [submittedAt=${tx.submittedAt?.toISOString()}]`,
      );
    }
  }

  /**
   * Log a daily summary of blockchain transaction counts by status.
   * Useful for ops dashboards and anomaly detection.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyHealthReport(): Promise<void> {
    const failedCount = await this.blockchainTxService.countFailed();
    const pendingWallets = await this.walletService.findPendingWallets();

    this.logger.log(
      `Daily blockchain health report:` +
      ` failedTxs=${failedCount}` +
      ` pendingWallets=${pendingWallets.length}`,
    );

    if (failedCount > 10) {
      this.logger.error(
        `ALERT: ${failedCount} failed blockchain transactions detected — review required`,
      );
    }
  }
}
