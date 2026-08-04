import {
  Request,
  Response,
} from "express";

import {
  UploadApiResponse,
} from "cloudinary";

import cloudinary from "../config/cloudinary.js";

import { Video } from "../models/Video.js";

const MAX_VIDEO_DURATION = 30;

/**
 * =========================================================
 * GET RANDOM APPROVED VIDEO
 * =========================================================
 *
 * Used by the public celebration hero to rotate
 * approved video messages.
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
 * =========================================================
 * GET LATEST APPROVED VIDEO
 * =========================================================
 *
 * Returns the most recently approved video.
 *
 * This is useful for the public hero when we want a newly
 * approved submission to become visible without requiring
 * the visitor to refresh the page.
 *
 * Sorting by reviewedAt ensures that approval time,
 * rather than original submission time, determines which
 * video is considered the newest approved video.
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
 * =========================================================
 * UPLOAD VIDEO
 * =========================================================
 *
 * Public users submit celebration videos.
 *
 * Every uploaded video starts as "pending".
 * It must be approved by an administrator before
 * it can appear publicly.
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
     * -------------------------------------------------------
     * VALIDATE NAME
     * -------------------------------------------------------
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
     * -------------------------------------------------------
     * VALIDATE CHURCH
     * -------------------------------------------------------
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
     * -------------------------------------------------------
     * VALIDATE FILE
     * -------------------------------------------------------
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
     * -------------------------------------------------------
     * VALIDATE DURATION
     * -------------------------------------------------------
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

    if (
      parsedDuration >
      MAX_VIDEO_DURATION
    ) {
      res.status(400).json({
        success: false,
        message:
          "Your video must be 30 seconds or less.",
      });

      return;
    }

    /**
     * -------------------------------------------------------
     * UPLOAD TO CLOUDINARY
     * -------------------------------------------------------
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

          /**
           * Cloudinary's TypeScript declaration can
           * sometimes expose UploadStream without the
           * Node WritableStream methods.
           *
           * The runtime object is a writable stream,
           * so we explicitly narrow it here.
           */
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
     * Keep track of the uploaded Cloudinary ID.
     *
     * If MongoDB creation fails afterwards, the
     * catch block will remove the orphaned video.
     */
    uploadedPublicId =
      uploadResult.public_id;

    /**
     * -------------------------------------------------------
     * CREATE DATABASE RECORD
     * -------------------------------------------------------
     *
     * IMPORTANT:
     *
     * New videos are ALWAYS pending.
     *
     * The admin must explicitly approve them.
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
     * -------------------------------------------------------
     * SUCCESS RESPONSE
     * -------------------------------------------------------
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
     * -------------------------------------------------------
     * ERROR HANDLING
     * -------------------------------------------------------
     */

    console.error(
      "Video upload failed:",
      error
    );

    /**
     * If Cloudinary succeeded but MongoDB failed,
     * remove the uploaded video from Cloudinary.
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
 * =========================================================
 * DELETE APPROVED VIDEO
 * =========================================================
 *
 * Administrator only.
 *
 * Deletes the approved video from:
 *
 * 1. Cloudinary
 * 2. MongoDB
 *
 * This prevents orphaned video files from remaining
 * in Cloudinary after the database record is removed.
 */
export async function deleteApprovedVideo(
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

    /**
     * -------------------------------------------------------
     * FIND APPROVED VIDEO
     * -------------------------------------------------------
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
     * -------------------------------------------------------
     * DELETE CLOUDINARY ASSET
     * -------------------------------------------------------
     *
     * Only attempt this if the database record contains
     * a Cloudinary public ID.
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

        /**
         * Cloudinary normally returns:
         *
         * {
         *   result: "ok"
         * }
         *
         * If the asset has already disappeared,
         * "not found" is acceptable because the desired
         * final state has already been achieved.
         */

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
      } catch (cloudinaryError) {
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
     * -------------------------------------------------------
     * DELETE DATABASE RECORD
     * -------------------------------------------------------
     */

    await Video.deleteOne({
      _id: video._id,
    });

    /**
     * -------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------
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