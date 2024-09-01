export const greet = () => ({
  message: () => 'Hello, GraphQL!',
  language: async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return 'typescript'
  }
})
