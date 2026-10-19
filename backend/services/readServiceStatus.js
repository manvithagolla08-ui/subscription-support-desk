import { incidentModel } from "../models/incidentModel.js";

const MAX_FEATURE_LENGTH = 100;

// Escape user input before using it in a regular expression.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function readServiceStatus({ feature } = {}) {
  // Validate input before querying MongoDB.
  if (feature !== undefined) {
    if (typeof feature !== "string") {
      return {
        success: false,
        incidents: [],
        error: {
          code: "INVALID_FEATURE",
          message: "Feature must be a string."
        }
      };
    }

    if (
      feature.trim().length === 0 ||
      feature.trim().length > MAX_FEATURE_LENGTH
    ) {
      return {
        success: false,
        incidents: [],
        error: {
          code: "INVALID_FEATURE",
          message:
            "Feature must contain between 1 and 100 characters."
        }
      };
    }
  }

  try {
    const filter = {};

    // No feature supplied means search all features.
    // A supplied feature performs case-insensitive partial matching.
    if (feature !== undefined) {
      filter.feature = {
        $regex: escapeRegex(feature.trim()),
        $options: "i"
      };
    }

    const records = await incidentModel
      .find(filter)
      .select("title feature description status")
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const incidents = records.map(record => ({
  title: record.title,
  feature: record.feature,
  description: record.description,

  status: record.status === "RESOLVED"
    ? "RESOLVED"
    : "ONGOING"
}));

    return {
      success: true,
      incidents
    };
  } catch (error) {
    console.error("Service status lookup failed:", error.message);

    return {
      success: false,
      incidents: [],
      error: {
        code: "SERVICE_STATUS_LOOKUP_FAILED",
        message: "Unable to retrieve service status."
      }
    };
  }
}