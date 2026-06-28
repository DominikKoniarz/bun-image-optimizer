import { createServer } from "node:net";

const isPortAvailable = (port: number): Promise<boolean> =>
    new Promise((resolve) => {
        const server = createServer();

        server.once("error", () => {
            resolve(false);
        });

        server.once("listening", () => {
            server.close(() => {
                resolve(true);
            });
        });

        server.listen(port);
    });

export const getAvailablePort = async (
    initialPort: number,
): Promise<number> => {
    if (initialPort < 1024) {
        throw new Error("Initial port must be greater than 1024");
    }

    for (let port = initialPort; port <= 65535; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }

    throw new Error(`No available port found starting from ${initialPort}`);
};
