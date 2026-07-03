const INITIAL_MOCK_PORT = 10000;

export const mockServerRoutes = {
    SOURCE_IMAGE: "/source-image",
    NOT_FOUND: "/404",
    PLAIN_TEXT: "/plain-text",
    SOURCE_IMAGE_SLOW: "/source-image-slow",
};

let sourceImageRequestCount = 0;

export const getSourceImageRequestCount = () => sourceImageRequestCount;
export const resetSourceImageRequestCount = () => (sourceImageRequestCount = 0);

let slowImageRequestCount = 0;

export const getSlowImageRequestCount = () => slowImageRequestCount;
export const resetSlowImageRequestCount = () => (slowImageRequestCount = 0);

export const createMockHttpServer = (port?: number) => {
    const sourceImage = Bun.file(
        `${import.meta.dir}/../assets/dave-meckler-0ltzud5qqYc-unsplash.jpg`,
    );

    return Bun.serve({
        routes: {
            [mockServerRoutes.SOURCE_IMAGE]: () => {
                sourceImageRequestCount++;

                return new Response(sourceImage);
            },
            [mockServerRoutes.NOT_FOUND]: () =>
                new Response("Not Found", { status: 404 }),
            [mockServerRoutes.PLAIN_TEXT]: () =>
                new Response("Plain text", {
                    headers: {
                        "Content-Type": "text/plain",
                    },
                }),
            [mockServerRoutes.SOURCE_IMAGE_SLOW]: async () => {
                slowImageRequestCount++;

                await Bun.sleep(500);

                return new Response(sourceImage);
            },
        },
        port: port ?? INITIAL_MOCK_PORT,
    });
};
