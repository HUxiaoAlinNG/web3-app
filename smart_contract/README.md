# compile、test

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
```

# deploy
 <!-- get the Transactions address -->
```shell
npx hardhat run scripts/deploy.js --network localhost
```

.

# replace

file path: client/src/utils/constants.ts
replace:

```js
export const contractAddress = [deploy result]
```
