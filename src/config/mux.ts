import Mux from "@mux/mux-node";

const tokenId =
  process.env.MUX_TOKEN_ID;

const tokenSecret =
  process.env.MUX_TOKEN_SECRET;

if (!tokenId) {
  throw new Error(
    "MUX_TOKEN_ID is not configured."
  );
}

if (!tokenSecret) {
  throw new Error(
    "MUX_TOKEN_SECRET is not configured."
  );
}

const mux = new Mux({
  tokenId,
  tokenSecret,
});

export default mux;