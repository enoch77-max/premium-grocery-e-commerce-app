export type DeliveryArea = {
  postcode: string;
  city: string;
  neighbourhood: string;
  eta: string;
  slots: string[];
};

export const SERVICE_AREAS: DeliveryArea[] = [
  {
    postcode: "11215",
    city: "Brooklyn",
    neighbourhood: "Sunset Park",
    eta: "25–40 min",
    slots: ["Express 25–40 min", "Today 6–8pm", "Today 8–10pm", "Tomorrow 9–11am"],
  },
  {
    postcode: "11217",
    city: "Brooklyn",
    neighbourhood: "Park Slope",
    eta: "25–40 min",
    slots: ["Express 25–40 min", "Today 6–8pm", "Tomorrow 9–11am"],
  },
  {
    postcode: "11201",
    city: "Brooklyn",
    neighbourhood: "Brooklyn Heights",
    eta: "30–45 min",
    slots: ["Express 30–45 min", "Today 7–9pm", "Tomorrow 9–11am"],
  },
  {
    postcode: "11211",
    city: "Brooklyn",
    neighbourhood: "Williamsburg",
    eta: "35–50 min",
    slots: ["Express 35–50 min", "Today 8–10pm", "Tomorrow 9–11am"],
  },
  {
    postcode: "11232",
    city: "Brooklyn",
    neighbourhood: "Greenwood",
    eta: "30–45 min",
    slots: ["Express 30–45 min", "Today 6–8pm", "Tomorrow 9–11am"],
  },
  {
    postcode: "10002",
    city: "New York",
    neighbourhood: "Lower East Side",
    eta: "40–55 min",
    slots: ["Express 40–55 min", "Today 8–10pm", "Tomorrow 9–11am"],
  },
];

export const DEFAULT_DELIVERY_AREA = SERVICE_AREAS[0];

export function findDeliveryArea(postcode: string): DeliveryArea | null {
  const clean = postcode.trim();
  return SERVICE_AREAS.find((area) => area.postcode === clean) ?? null;
}

export function isServiceable(postcode: string) {
  return Boolean(findDeliveryArea(postcode));
}
