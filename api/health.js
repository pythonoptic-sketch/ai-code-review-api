export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    wallet: "0xFA214C4F602d85ba5DbCCfCb6033C6b0a0bBCb7B",
    reviews_in_memory: Object.keys(global._reviews || {}).length,
    timestamp: new Date().toISOString()
  });
}
