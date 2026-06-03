// Centralizes Leaflet setup so it runs exactly once when any map mounts.
// Importing this module:
//   1. loads Leaflet's stylesheet, and
//   2. fixes the default marker icons, which otherwise 404 under Vite's
//      bundling because Leaflet builds the image URLs from its own source path.
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

export default L;
