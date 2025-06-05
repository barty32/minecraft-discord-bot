# MCserver interface - Server API
To be ran on the same computer where the Minecraft server files live - copy into MC server root directory.

**NOTE: The computer must have Wake-On-Lan enabled in BIOS!**

Enable services \
`cd services` \
`sudo systemctl enable ./wol.service` \
`sudo systemctl enable ./server-api.service`

Add this to the end of `/etc/sudoers` \
`<insert your username here> ALL=NOPASSWD: /usr/sbin/shutdown,/usr/bin/systemctl poweroff`

## Config options
Create a file named `config.json` in this directory

| Option                  | Type        | Description                                                                                | Default                                                                                                                                                                                            |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serverPort`            | `number?`   | Port on which this server API will run                                                     | `25566`                                                                                                                                                                                            |
| `minecraftPort`         | `number?`   | Port on which the Minecraft server is running (should match server.properties.server-port) | `25565`                                                                                                                                                                                            |
| `minecraftWorldName`    | `string`    | Name of your Minecraft world (should match server.properties.level-name)                   |                                                                                                                                                                                                    |
| `rconPort`              | `number?`   | Port for RCON access to the Minecraft server (should match server.properties.rcon.port)    | `25575`                                                                                                                                                                                            |
| `rconPassword`          | `string`    | RCON password (should match server.properties.rcon.password)                               |                                                                                                                                                                                                    |
| `secretKey`             | `string`    | Random string shared between the server and client                                         |                                                                                                                                                                                                    |
| `remoteShutdownEnabled` | `boolean?`  | whether remote shutdown of this computer is enabled                                        | `false`                                                                                                                                                                                            |
| `serverRootPath`        | `string`    | Absolute path to the root directory of your MC server                                      |                                                                                                                                                                                                    |
| `backupPath`            | `string?`   | Absolute path to the directory where world backups will be stored                          | `<serverRootPath>/backups`                                                                                                                                                                         |
| `preStartScript`        | `string?`   | Absolute path to a script which will be executed before starting Minecraft server          |                                                                                                                                                                                                    |
| `postStartScript`       | `string?`   | Absolute path to a script which will be executed when the Minecraft server is online       |                                                                                                                                                                                                    |
| `javaExecutable`        | `string?`   | Path to the Java executable (e.g., /usr/bin/java)                                          | `java`                                                                                                                                                                                             |
| `javaArgs`              | `string[]?` | An array of arguments to pass to the Java executable                                       | `-Xmx7G -XX:ParallelGCThreads=2 -XX:+UseConcMarkSweepGC -XX:+UseParNewGC -jar forge-server.jar -Dfml.readTimeout=180 -Dfml.queryResult=confirm -Dlog4j.configurationFile=log4j2_112-116.xml nogui` |
|                         |             |                                                                                            |                                                                                                                                                                                                    |

