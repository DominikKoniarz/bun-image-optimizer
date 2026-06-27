const INITIAL_MOCK_PORT = 10000;

export const mockServerRoutes = {
    SOURCE_IMAGE: "/source-image",
    NOT_FOUND: "/404",
    PLAIN_TEXT: "/plain-text",
};

export const createMockHttpServer = (port?: number) => {
    const sourceImage = Bun.file(
        `${import.meta.dir}/../assets/dave-meckler-0ltzud5qqYc-unsplash.jpg`,
    );

    return Bun.serve({
        routes: {
            [mockServerRoutes.SOURCE_IMAGE]: () => new Response(sourceImage),
            [mockServerRoutes.NOT_FOUND]: () =>
                new Response("Not Found", { status: 404 }),
            [mockServerRoutes.PLAIN_TEXT]: () =>
                new Response("text/plain", {
                    headers: {
                        "Content-Type": "text/plain",
                    },
                }),
        },
        port: port ?? INITIAL_MOCK_PORT,
    });
};
