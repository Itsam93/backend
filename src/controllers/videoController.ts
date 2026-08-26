import {
  Request,
  Response,
} from "express";

import {
  UploadApiResponse,
} from "cloudinary";

import cloudinary from "../config/cloudinary.js";

import { Video } from "../models/Video.js";

/**
 * ============================================================
 * VIDEO UPLOAD LIMITS
 * ============================================================
 */

const MAX_VIDEO_DURATION = 120; // 2 minutes
const MAX_FILE_SIZE =
  100 * 1024 * 1024; // 100 MB

/**
 * ============================================================
 * GET RANDOM APPROVED VIDEO
 * ============================================================
 */

export async function getRandomApprovedVideo(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const videos =
      await Video.aggregate([
        {
          $match: {
            status: "approved",
          },
        },
        {
          $sample: {
            size: 1,
          },
        },
      ]);

    res.status(200).json({
      success: true,
      data: videos[0] ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch random approved video:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch video.",
    });
  }
}

/**
 * ============================================================
 * GET LATEST APPROVED VIDEO
 * ============================================================
 */

export async function getLatestApprovedVideo(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const video =
      await Video.findOne({
        status: "approved",
      })
        .sort({
          reviewedAt: -1,
          updatedAt: -1,
        })
        .lean();

    res.status(200).json({
      success: true,
      data: video ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to fetch latest approved video:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch latest approved video.",
    });
  }
}

/**
 * ============================================================
 * UPLOAD VIDEO
 * ============================================================
 */

export async function uploadVideo(
  req: Request,
  res: Response
): Promise<void> {
  let uploadedPublicId:
    | string
    | null = null;

  try {
    const {
      name,
      church,
      duration,
    } = req.body;

    const file = req.file;

    /**
     * ========================================================
     * VALIDATE NAME
     * ========================================================
     */

    const trimmedName =
      typeof name === "string"
        ? name.trim()
        : "";

    if (!trimmedName) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your name.",
      });

      return;
    }

    if (trimmedName.length > 80) {
      res.status(400).json({
        success: false,
        message:
          "Name must not exceed 80 characters.",
      });

      return;
    }

    /**
     * ========================================================
     * VALIDATE CHURCH
     * ========================================================
     */

    const trimmedChurch =
      typeof church === "string"
        ? church.trim()
        : "";

    if (!trimmedChurch) {
      res.status(400).json({
        success: false,
        message:
          "Please provide your church.",
      });

      return;
    }

    if (trimmedChurch.length > 120) {
      res.status(400).json({
        success: false,
        message:
          "Church name must not exceed 120 characters.",
      });

      return;
    }

    /**
     * ========================================================
     * VALIDATE VIDEO FILE
     * ========================================================
     */

    if (!file) {
      res.status(400).json({
        success: false,
        message:
          "Please select a video.",
      });

      return;
    }

    /**
     * ========================================================
     * VALIDATE FILE SIZE
     * ========================================================
     *
     * Multer also enforces this limit, but we keep the
     * controller-level validation as an additional safeguard.
     */

    if (file.size > MAX_FILE_SIZE) {
      res.status(400).json({
        success: false,
        message:
          "Your video must be 100 MB or less.",
      });

      return;
    }

    /**
     * ========================================================
     * VALIDATE VIDEO DURATION
     * ========================================================
     */

    const parsedDuration =
      Number(duration);

    if (
      !Number.isFinite(
        parsedDuration
      ) ||
      parsedDuration <= 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "A valid video duration is required.",
      });

      return;
    }

    /**
     * Maximum duration:
     * 120 seconds = 2 minutes
     */

    if (
      parsedDuration >
      MAX_VIDEO_DURATION
    ) {
      res.status(400).json({
        success: false,
        message:
          "Your video must be 2 minutes or less.",
      });

      return;
    }

    /**
     * ========================================================
     * UPLOAD TO CLOUDINARY
     * ========================================================
     */

    const uploadResult =
      await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                resource_type: "video",

                folder:
                  "birthday-celebration/videos",

                use_filename: true,

                unique_filename: true,

                overwrite: false,
              },

              (
                error,
                result
              ) => {
                if (error) {
                  reject(error);
                  return;
                }

                if (!result) {
                  reject(
                    new Error(
                      "Cloudinary returned no upload result."
                    )
                  );

                  return;
                }

                resolve(result);
              }
            );

          const writableStream =
            uploadStream as unknown as {
              end: (
                chunk: Buffer
              ) => void;
            };

          writableStream.end(
            file.buffer
          );
        }
      );

    /**
     * Keep track of the Cloudinary public ID.
     *
     * If database creation fails after the upload,
     * the catch block can remove the uploaded video.
     */

    uploadedPublicId =
      uploadResult.public_id;

    /**
     * ========================================================
     * SAVE VIDEO TO DATABASE
     * ========================================================
     */

    const video =
      await Video.create({
        name: trimmedName,

        church: trimmedChurch,

        videoUrl:
          uploadResult.secure_url,

        publicId:
          uploadResult.public_id,

        fileName:
          file.originalname,

        duration:
          parsedDuration,

        status: "pending",

        submittedAt:
          new Date(),

        reviewedAt: null,
      });

    /**
     * ========================================================
     * SUCCESS RESPONSE
     * ========================================================
     */

    res.status(201).json({
      success: true,

      message:
        "Your video has been submitted successfully and is awaiting review.",

      data: {
        id: video._id,

        name: video.name,

        church: video.church,

        videoUrl:
          video.videoUrl,

        duration:
          video.duration,

        status:
          video.status,

        submittedAt:
          video.submittedAt,
      },
    });
  } catch (error) {
    /**
     * ========================================================
     * ERROR HANDLING
     * ========================================================
     */

    console.error(
      "Video upload failed:",
      error
    );

    /**
     * ========================================================
     * CLOUDINARY CLEANUP
     * ========================================================
     *
     * If the video was successfully uploaded to Cloudinary
     * but something failed afterward, remove the orphaned
     * Cloudinary asset.
     */

    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(
          uploadedPublicId,
          {
            resource_type: "video",
          }
        );
      } catch (cleanupError) {
        console.error(
          "Failed to clean up Cloudinary video:",
          cleanupError
        );
      }
    }

    /**
     * ========================================================
     * RETURN ERROR
     * ========================================================
     */

    if (
      error instanceof Error
    ) {
      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to upload video.",
      });

      return;
    }

    res.status(500).json({
      success: false,

      message:
        "Failed to upload video.",
    });
  }
}

/**
 * ============================================================
 * DELETE APPROVED VIDEO
 * ============================================================
 */

export async function deleteApprovedVideo(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } =
      req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message:
          "Video ID is required.",
      });

      return;
    }

    /**
     * Only approved videos can be deleted
     * through this endpoint.
     */

    const video =
      await Video.findOne({
        _id: id,
        status: "approved",
      });

    if (!video) {
      res.status(404).json({
        success: false,
        message:
          "Approved video not found.",
      });

      return;
    }

    /**
     * ========================================================
     * DELETE FROM CLOUDINARY
     * ========================================================
     */

    if (video.publicId) {
      try {
        const cloudinaryResult =
          await cloudinary.uploader.destroy(
            video.publicId,
            {
              resource_type: "video",
            }
          );

        if (
          cloudinaryResult.result !==
            "ok" &&
          cloudinaryResult.result !==
            "not found"
        ) {
          console.error(
            "Cloudinary video deletion returned unexpected result:",
            cloudinaryResult
          );

          res.status(500).json({
            success: false,
            message:
              "Failed to remove video from Cloudinary.",
          });

          return;
        }
      } catch (
        cloudinaryError
      ) {
        console.error(
          "Failed to delete video from Cloudinary:",
          cloudinaryError
        );

        res.status(500).json({
          success: false,
          message:
            "Failed to remove video from storage.",
        });

        return;
      }
    }

    /**
     * ========================================================
     * DELETE FROM DATABASE
     * ========================================================
     */

    await Video.deleteOne({
      _id: video._id,
    });

    /**
     * ========================================================
     * SUCCESS RESPONSE
     * ========================================================
     */

    res.status(200).json({
      success: true,

      message:
        "Approved video deleted successfully.",

      data: {
        id: video._id,
      },
    });
  } catch (error) {
    console.error(
      "Failed to delete approved video:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to delete approved video.",
    });
  }
}

/**
 * ============================================================
 * GET ALL APPROVED VIDEOS
 * ============================================================
 */

export async function getApprovedVideos(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const videos =
      await Video.find({
        status: "approved",
      })
        .select(
          "_id name church videoUrl createdAt duration"
        )
        .sort({
          reviewedAt: -1,
          createdAt: -1,
        })
        .lean();

    res.status(200).json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error(
      "Failed to fetch approved videos:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch approved videos.",
    });
  }
}