/** Old URLs keep working (QR codes already shared point to /pay/...). Query strings are carried over automatically. */
const moved = [
  ["/pay/:m", "/bayar/:m"], ["/loan/:id", "/modal/:id"], ["/m/:m", "/t/:m"], ["/dashboard", "/toko"], ["/onboard", "/mulai"],
  ["/redteam", "/protocol/redteam"], ["/agent", "/protocol/agent"], ["/pool", "/protocol/pool"],
];
export default {
  async redirects() {
    return moved.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};
