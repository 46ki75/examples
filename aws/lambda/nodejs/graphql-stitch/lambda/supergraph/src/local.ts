import { server } from '.'
import { startStandaloneServer } from '@apollo/server/standalone'

void (async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 }
  })

  console.log(`🚀  Server ready at: ${url}`)
})()
