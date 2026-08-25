import {
  type Request,
  type Response,
} from "express";

import {
  DEFAULT_ROTATION_MINUTES,
  MAX_RUNTIME_MINUTES,
  MAX_STREAMS,
  activateLiveStream,
  checkActiveStreamHealth,
  checkAllStreamHealth,
  deactivateLiveStream,
  getActiveLiveStream,
  getAllLiveStreams,
  getLiveStreamBySequence,
  getNextLiveStream,
  getPublicLiveStream,
  getPublicStreamPool,
  getRotationState,
  getStreamDueForRotation,
  markStreamError,
  markStreamEnded,
  markStreamLive,
  markStreamStarting,
  markStreamTransitioning,
  prepareStreamForRotation,
} from "../services/liveStreamService.js";

/**
 * ============================================================
 * ROUTE PARAMETER HELPERS
 * ============================================================
 */

/**
 * Extract and validate a stream ID from route parameters.
 */
function getStreamId(
  value: string | string[] | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const streamId = value.trim();

  return streamId.length > 0
    ? streamId
    : null;
}

/**
 * Extract and validate a stream sequence.
 */
function getSequence(
  value: string | string[] | undefined
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const sequence = Number(value);

  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > MAX_STREAMS
  ) {
    return null;
  }

  return sequence;
}

/**
 * ============================================================
 * PUBLIC LIVE STREAM
 * ============================================================
 *
 * GET /api/live-stream
 */
export async function getPublicLiveStreamController(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await getPublicLiveStream();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Failed to get public live stream:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve live stream.",
    });
  }
}

/**
 * ============================================================
 * PUBLIC STREAM POOL
 * ============================================================
 *
 * GET /api/live-stream/pool
 */
export async function getPublicStreamPoolController(
  _req: Request,
  res: Response
) {
  try {
    const streams =
      await getPublicStreamPool();

    return res.status(200).json({
      success: true,
      data: {
        streams,
        count: streams.length,
      },
    });
  } catch (error) {
    console.error(
      "Failed to get live stream pool:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve live stream pool.",
    });
  }
}

/**
 * ============================================================
 * ADMIN: GET ALL STREAMS
 * ============================================================
 *
 * GET /api/live-stream/admin/all
 */
export async function getAllLiveStreamsController(
  _req: Request,
  res: Response
) {
  try {
    const streams =
      await getAllLiveStreams();

    return res.status(200).json({
      success: true,
      data: {
        streams,
        count: streams.length,
      },
    });
  } catch (error) {
    console.error(
      "Failed to get all live streams:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve live streams.",
    });
  }
}

/**
 * ============================================================
 * GET STREAM BY SEQUENCE
 * ============================================================
 *
 * GET /api/live-stream/sequence/:sequence
 */
export async function getLiveStreamBySequenceController(
  req: Request,
  res: Response
) {
  try {
    const sequence =
      getSequence(
        req.params.sequence
      );

    if (sequence === null) {
      return res.status(400).json({
        success: false,
        message:
          `Sequence must be an integer between 1 and ${MAX_STREAMS}.`,
      });
    }

    const stream =
      await getLiveStreamBySequence(
        sequence
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          `Stream with sequence ${sequence} was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to get stream by sequence:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve stream.",
    });
  }
}

/**
 * ============================================================
 * GET ACTIVE STREAM
 * ============================================================
 *
 * GET /api/live-stream/admin/active
 */
export async function getActiveLiveStreamController(
  _req: Request,
  res: Response
) {
  try {
    const stream =
      await getActiveLiveStream();

    return res.status(200).json({
      success: true,
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to get active live stream:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve active stream.",
    });
  }
}

/**
 * ============================================================
 * ACTIVATE STREAM
 * ============================================================
 *
 * POST /api/live-stream/:streamId/activate
 *
 * IMPORTANT:
 * This changes the website's active stream.
 *
 * It does NOT start OBS or Cloudinary ingestion.
 */
export async function activateLiveStreamController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const stream =
      await activateLiveStream(
        streamId
      );

    return res.status(200).json({
      success: true,
      message:
        "Live stream activated successfully.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to activate live stream:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to activate live stream.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/**
 * ============================================================
 * DEACTIVATE STREAM
 * ============================================================
 *
 * POST /api/live-stream/:streamId/deactivate
 */
export async function deactivateLiveStreamController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const stream =
      await deactivateLiveStream(
        streamId
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Live stream deactivated successfully.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to deactivate live stream:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to deactivate live stream.",
    });
  }
}

/**
 * ============================================================
 * MARK STREAM STARTING
 * ============================================================
 *
 * POST /api/live-stream/:streamId/starting
 */
export async function markStreamStartingController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const stream =
      await markStreamStarting(
        streamId
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Live stream marked as starting.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to mark stream as starting:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stream status.",
    });
  }
}

/**
 * ============================================================
 * MARK STREAM LIVE
 * ============================================================
 *
 * POST /api/live-stream/:streamId/live
 */
export async function markStreamLiveController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const stream =
      await markStreamLive(
        streamId
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Live stream marked as live.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to mark stream as live:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stream status.",
    });
  }
}

/**
 * ============================================================
 * MARK STREAM TRANSITIONING
 * ============================================================
 *
 * POST /api/live-stream/:streamId/transitioning
 */
export async function markStreamTransitioningController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const stream =
      await markStreamTransitioning(
        streamId
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Live stream marked as transitioning.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to mark stream as transitioning:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stream status.",
    });
  }
}

/**
 * ============================================================
 * MARK STREAM ENDED
 * ============================================================
 *
 * POST /api/live-stream/:streamId/ended
 */
export async function markStreamEndedController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const stream =
      await markStreamEnded(
        streamId
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Live stream marked as ended.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to mark stream as ended:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stream status.",
    });
  }
}

/**
 * ============================================================
 * MARK STREAM ERROR
 * ============================================================
 *
 * POST /api/live-stream/:streamId/error
 *
 * Body:
 * {
 *   "error": "Description of the error"
 * }
 */
export async function markStreamErrorController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const errorValue =
      typeof req.body?.error ===
        "string" &&
      req.body.error.trim().length > 0
        ? req.body.error.trim()
        : "Unknown live-stream error.";

    const stream =
      await markStreamError(
        streamId,
        errorValue
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Live stream marked as errored.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to mark stream as error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stream status.",
    });
  }
}

/**
 * ============================================================
 * HEALTH CHECK — ACTIVE STREAM
 * ============================================================
 *
 * POST /api/live-stream/health
 */
export async function checkActiveStreamHealthController(
  _req: Request,
  res: Response
) {
  try {
    const stream =
      await checkActiveStreamHealth();

    if (!stream) {
      return res.status(200).json({
        success: true,
        data: {
          isLive: false,
          stream: null,
        },
      });
    }

    const isLive =
      stream.status === "live" ||
      stream.status === "transitioning";

    return res.status(200).json({
      success: true,
      data: {
        isLive,
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to check active stream health:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to check stream health.",
    });
  }
}

/**
 * ============================================================
 * HEALTH CHECK — ALL STREAMS
 * ============================================================
 *
 * POST /api/live-stream/health/all
 */
export async function checkAllStreamHealthController(
  _req: Request,
  res: Response
) {
  try {
    const results =
      await checkAllStreamHealth();

    const failed =
      results.filter(
        (result) =>
          !result.success
      );

    return res.status(200).json({
      success: true,
      data: {
        results,
        total:
          results.length,
        healthy:
          results.length -
          failed.length,
        failed:
          failed.length,
      },
    });
  } catch (error) {
    console.error(
      "Failed to check all stream health:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to check stream health.",
    });
  }
}

/**
 * ============================================================
 * PREPARE STREAM FOR ROTATION
 * ============================================================
 *
 * POST /api/live-stream/:streamId/prepare-rotation
 *
 * Body:
 * {
 *   "rotationMinutes": 170
 * }
 */
export async function prepareStreamForRotationController(
  req: Request,
  res: Response
) {
  try {
    const streamId =
      getStreamId(
        req.params.streamId
      );

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message:
          "Stream ID is required.",
      });
    }

    const requestedMinutes =
      req.body?.rotationMinutes;

    const rotationMinutes =
      requestedMinutes ===
      undefined
        ? DEFAULT_ROTATION_MINUTES
        : Number(
            requestedMinutes
          );

    if (
      !Number.isFinite(
        rotationMinutes
      ) ||
      rotationMinutes <= 0 ||
      rotationMinutes >=
        MAX_RUNTIME_MINUTES
    ) {
      return res.status(400).json({
        success: false,
        message:
          `rotationMinutes must be greater than 0 and less than ${MAX_RUNTIME_MINUTES}.`,
      });
    }

    const stream =
      await prepareStreamForRotation(
        streamId,
        rotationMinutes
      );

    return res.status(200).json({
      success: true,
      message:
        "Stream prepared for rotation.",
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to prepare stream for rotation:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to prepare stream for rotation.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/**
 * ============================================================
 * GET ROTATION STATE
 * ============================================================
 *
 * GET /api/live-stream/rotation
 */
export async function getRotationStateController(
  _req: Request,
  res: Response
) {
  try {
    const state =
      await getRotationState();

    return res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error) {
    console.error(
      "Failed to get rotation state:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve rotation state.",
    });
  }
}

/**
 * ============================================================
 * GET STREAM DUE FOR ROTATION
 * ============================================================
 *
 * GET /api/live-stream/rotation/due
 */
export async function getStreamDueForRotationController(
  _req: Request,
  res: Response
) {
  try {
    const stream =
      await getStreamDueForRotation();

    return res.status(200).json({
      success: true,
      data: {
        due:
          stream !== null,
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to determine rotation status:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to determine rotation status.",
    });
  }
}

/**
 * ============================================================
 * GET NEXT STREAM
 * ============================================================
 *
 * GET /api/live-stream/next/:sequence
 */
export async function getNextLiveStreamController(
  req: Request,
  res: Response
) {
  try {
    const sequence =
      getSequence(
        req.params.sequence
      );

    if (sequence === null) {
      return res.status(400).json({
        success: false,
        message:
          `Sequence must be an integer between 1 and ${MAX_STREAMS}.`,
      });
    }

    const stream =
      await getNextLiveStream(
        sequence
      );

    if (!stream) {
      return res.status(404).json({
        success: false,
        message:
          "Next live stream was not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        stream,
      },
    });
  } catch (error) {
    console.error(
      "Failed to get next live stream:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve next live stream.",
    });
  }
}