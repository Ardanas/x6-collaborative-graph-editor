import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'

const server = Server.configure({
  port: 1234,
  name: "hocuspocus-fra1-01",
  async connected() {
    console.log("connections:", server.getConnectionsCount());
  },
  extensions: [
    new Logger({
        log: (message) => {
            // do something custom here
            console.log(message);
          },
    }),
  ],
})

server.listen()