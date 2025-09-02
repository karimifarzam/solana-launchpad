// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://jestjs.io/docs/configuration#setupfilesafterenv-array
import 'whatwg-fetch'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'devnet'
process.env.NEXT_PUBLIC_LAUNCHPAD_PROGRAM_ID = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS'
process.env.NEXT_PUBLIC_METEORA_PROGRAM_ID = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'

// Mock browser APIs
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock wallet adapter
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: false,
    publicKey: null,
    signTransaction: null,
    signAllTransactions: null,
  }),
  useConnection: () => ({
    connection: {
      getLatestBlockhash: jest.fn(),
      getAccountInfo: jest.fn(),
      sendTransaction: jest.fn(),
      confirmTransaction: jest.fn(),
    },
  }),
}))

// Suppress console warnings during tests
const originalConsoleWarn = console.warn
beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalConsoleWarn(...args)
  }
})

afterEach(() => {
  console.warn = originalConsoleWarn
})