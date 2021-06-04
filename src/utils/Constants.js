const INTEREST_NUMERATOR = 25
const INTEREST_DENOMINATOR = 10000
const INTEREST = { NUMERATOR: INTEREST_NUMERATOR, DENOMINATOR: INTEREST_DENOMINATOR }

const TOKEN_NAME = 'Interest Faster Than Light'
const TOKEN_SYMBOL = 'IFTL'
const INITIAL_BALANCE = 1000
const TOKEN = { NAME: TOKEN_NAME, SYMBOL: TOKEN_SYMBOL, INITIAL_BALANCE }

const MULTIPLIER = 1E12
const LOCK_TIME = 24 * 60 * 60
const DEPLOYMENT_NETWORK = 'mumbai'
const NETWORK = { DEPLOYMENT: DEPLOYMENT_NETWORK }
const constants = { MULTIPLIER, INTEREST, TOKEN, LOCK_TIME, NETWORK }

export { constants }
