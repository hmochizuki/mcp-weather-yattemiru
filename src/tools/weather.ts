import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

const requestSchema = {
  name: "get_forecast",
  description: "Get weather forecast for a location",
  inputSchema: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        description: "Latitude of the location",
      },
      longitude: {
        type: "number",
        description: "Longitude of the location",
      },
    },
  },
} as const;


const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NEW request:", error);
    return null;
  }
}

const handler = async (request: CallToolRequest) => {
  const { latitude, longitude } = request.params.arguments as { latitude: number, longitude: number };

  // Get grid point data
  const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

  if (!pointsData) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
        },
      ],
    };
  }

  const forecastUrl = pointsData.properties?.forecast;
  if (!forecastUrl) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to get forecast URL from grid point data",
        },
      ],
    };
  }

  // Get forecast data
  const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
  if (!forecastData) {
    return {
      content: [
        {
          type: "text",
          text: "Failed to retrieve forecast data",
        },
      ],
    };
  }

  const periods = forecastData.properties?.periods || [];
  if (periods.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No forecast periods available",
        },
      ],
    };
  }

  // Format forecast periods
  const formattedForecast = periods.map((period: ForecastPeriod) =>
    [
      `${period.name || "Unknown"}:`,
      `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
      `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
      `${period.shortForecast || "No forecast available"}`,
      "---",
    ].join("\n"),
  );

  const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

  return {
    content: [
      {
        type: "text",
        text: forecastText,
      },
    ],
  };
}

// TODO: handler に適切な型定義をつける
export default {
  requestSchema,
  handler,
}
