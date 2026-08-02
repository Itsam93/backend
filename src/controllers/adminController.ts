import type {
  Request,
  Response,
} from "express";

import { Message } from "../models/Message.js";
import { Video } from "../models/Video.js";

function parsePositiveInteger(
  value: unknown,
  fallback: number
): number {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function parseStatus(
  value: unknown
): "pending" | "approved" | "rejected" | undefined {
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value;
  }

  return undefined;
}

export async function getAdminDashboard(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const [
      messageTotal,
      messagePending,
      messageApproved,
      messageRejected,
      videoTotal,
      videoPending,
      videoApproved,
      videoRejected,
    ] = await Promise.all([
      Message.countDocuments(),

      Message.countDocuments({
        status: "pending",
      }),

      Message.countDocuments({
        status: "approved",
      }),

      Message.countDocuments({
        status: "rejected",
      }),

      Video.countDocuments(),

      Video.countDocuments({
        status: "pending",
      }),

      Video.countDocuments({
        status: "approved",
      }),

      Video.countDocuments({
        status: "rejected",
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        messages: {
          total: messageTotal,
          pending: messagePending,
          approved: messageApproved,
          rejected: messageRejected,
        },

        videos: {
          total: videoTotal,
          pending: videoPending,
          approved: videoApproved,
          rejected: videoRejected,
        },

        totals: {
          total:
            messageTotal +
            videoTotal,

          pending:
            messagePending +
            videoPending,

          approved:
            messageApproved +
            videoApproved,

          rejected:
            messageRejected +
            videoRejected,
        },
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch admin dashboard:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch admin dashboard.",
    });
  }
}


export async function getAdminMessages(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const limit = Math.min(
      parsePositiveInteger(
        req.query.limit,
        20
      ),
      100
    );

    const status =
      parseStatus(
        req.query.status
      );

    const skip =
      (page - 1) * limit;

    const filter = status
      ? { status }
      : {};

    const [
      messages,
      total,
    ] = await Promise.all([
      Message.find(filter)
        .sort({
          submittedAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Message.countDocuments(filter),
    ]);

    const totalPages =
      Math.ceil(total / limit);

    res.status(200).json({
      success: true,

      data: messages,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch admin messages:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch messages.",
    });
  }
}


export async function getAdminVideos(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const page =
      parsePositiveInteger(
        req.query.page,
        1
      );

    const limit = Math.min(
      parsePositiveInteger(
        req.query.limit,
        20
      ),
      100
    );

    const status =
      parseStatus(
        req.query.status
      );

    const skip =
      (page - 1) * limit;

    const filter = status
      ? { status }
      : {};

    const [
      videos,
      total,
    ] = await Promise.all([
      Video.find(filter)
        .sort({
          submittedAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Video.countDocuments(filter),
    ]);

    const totalPages =
      Math.ceil(total / limit);

    res.status(200).json({
      success: true,

      data: videos,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage:
          page < totalPages,
        hasPreviousPage:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Failed to fetch admin videos:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch videos.",
    });
  }
}


export async function approveMessage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Message ID is required.",
      });

      return;
    }

    const message =
      await Message.findByIdAndUpdate(
        id,
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!message) {
      res.status(404).json({
        success: false,
        message:
          "Message not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Message approved successfully.",
      data: message,
    });
  } catch (error) {
    console.error(
      "Failed to approve message:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to approve message.",
    });
  }
}


export async function rejectMessage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Message ID is required.",
      });

      return;
    }

    const message =
      await Message.findByIdAndUpdate(
        id,
        {
          $set: {
            status: "rejected",
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!message) {
      res.status(404).json({
        success: false,
        message:
          "Message not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Message rejected successfully.",
      data: message,
    });
  } catch (error) {
    console.error(
      "Failed to reject message:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to reject message.",
    });
  }
}


export async function approveVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Video ID is required.",
      });

      return;
    }

    const video =
      await Video.findByIdAndUpdate(
        id,
        {
          $set: {
            status: "approved",
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!video) {
      res.status(404).json({
        success: false,
        message:
          "Video not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Video approved successfully.",
      data: video,
    });
  } catch (error) {
    console.error(
      "Failed to approve video:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to approve video.",
    });
  }
}


export async function rejectVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Video ID is required.",
      });

      return;
    }

    const video =
      await Video.findByIdAndUpdate(
        id,
        {
          $set: {
            status: "rejected",
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).lean();

    if (!video) {
      res.status(404).json({
        success: false,
        message:
          "Video not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Video rejected successfully.",
      data: video,
    });
  } catch (error) {
    console.error(
      "Failed to reject video:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to reject video.",
    });
  }
}


export async function deleteMessage(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Message ID is required.",
      });

      return;
    }

    const message =
      await Message.findByIdAndDelete(id)
        .lean();

    if (!message) {
      res.status(404).json({
        success: false,
        message:
          "Message not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Message deleted successfully.",
      data: {
        id: message._id,
      },
    });
  } catch (error) {
    console.error(
      "Failed to delete message:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to delete message.",
    });
  }
}


export async function deleteVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Video ID is required.",
      });

      return;
    }

    const video =
      await Video.findByIdAndDelete(id)
        .lean();

    if (!video) {
      res.status(404).json({
        success: false,
        message:
          "Video not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message:
        "Video deleted successfully.",
      data: {
        id: video._id,
      },
    });
  } catch (error) {
    console.error(
      "Failed to delete video:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to delete video.",
    });
  }
}