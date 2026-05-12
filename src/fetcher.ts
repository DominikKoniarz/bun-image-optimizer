type FetchSourceImageResult =
    | {
          error: string;
          arrayBuffer: null;
      }
    | {
          error: null;
          arrayBuffer: ArrayBuffer;
      };

export const fetchSourceImage = async (
    url: string,
): Promise<FetchSourceImageResult> => {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            return {
                error: "Failed to fetch source image",
                arrayBuffer: null,
            };
        }

        // TODO: sanitize content type, size and stuff

        return {
            error: null,
            arrayBuffer: await response.arrayBuffer(),
        };
    } catch (error) {
        console.error(error);

        return {
            error: "Failed to fetch source image",
            arrayBuffer: null,
        };
    }
};
