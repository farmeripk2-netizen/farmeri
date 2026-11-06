import { Link } from "react-router-dom";
import { useData } from "./ui";
import defaults from "./storefront-defaults.json";
export { defaults };
export const placements = {
  isHero: "Hero carousel",
  isRack: "Rack",
  isFeatured: "Featured",
  isNewArrival: "New Drops",
};
export const storefrontPath = "/settings/public";
export function useStorefront() {
  const { data } = useData("settings", storefrontPath);
  return data?.storefront || defaults;
}
export function ContentLink({ href, children, ...props }) {
  return href.startsWith("/") ? (
    <Link to={href} {...props}>
      {children}
    </Link>
  ) : (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
