# CheesePay API Specification


1. **`POST /auth/signup`** - User registration with email, password and  whatever information is required
2. **`POST /auth/verify-otp`** - OTP verification and token generation
3. **`POST /auth/login`** - User login
4. **`GET /wallet/balance`** - Get user's USDC and fiat balances
5. **`GET /wallet/deposit-address`** - Generate USDC deposit address
6. **`GET /wallet/transactions`** - Transaction history
7. **`POST /transactions/send`** - Send money (USDC to bank/wallet)
8. **`POST /transactions/calculate-fees`** - Calculate fees and exchange rates
9. **`POST /fiat/on-ramp/bank-transfer`** - Create virtual account for deposits
10. **`POST /fiat/off-ramp/bank-accounts`** - Add bank account for withdrawals




- Sign up → Login → View balance → Deposit USDC → Send money → Withdraw to bank







