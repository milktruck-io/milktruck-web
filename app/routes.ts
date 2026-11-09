import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Trivia game show — temporary, for presentation night. See app/trivia/.
  route("game", "routes/game.tsx"),
  route("game/admin", "routes/game.admin.tsx"),
] satisfies RouteConfig;
