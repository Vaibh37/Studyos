const express = require("express");
const crypto = require("crypto");

const firebaseAuth = require(
  "../middleware/firebaseAuth"
);

const Group = require(
  "../models/social/Group"
);

const GroupMember = require(
  "../models/social/GroupMember"
);

const GroupStudySession = require(
  "../models/social/GroupStudySession"
);

const LiveSession = require(
  "../models/social/LiveSession"
);

const GroupMessage = require(
  "../models/social/GroupMessage"
);

const router = express.Router();


// =========================================================
// GENERATE INVITE CODE
// =========================================================

const generateInviteCode = () => {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();
};


// =========================================================
// GENERATE UNIQUE INVITE CODE
// =========================================================

const generateUniqueInviteCode =
  async () => {
    let inviteCode;
    let exists = true;

    while (exists) {
      inviteCode =
        generateInviteCode();

      exists =
        await Group.exists({
          inviteCode,
        });
    }

    return inviteCode;
  };


// =========================================================
// START OF CURRENT WEEK
//
// Monday 00:00 UTC
// =========================================================

const getStartOfWeek = () => {
  const now =
    new Date();

  const start =
    new Date(now);

  const day =
    start.getUTCDay();

  const daysSinceMonday =
    day === 0
      ? 6
      : day - 1;

  start.setUTCDate(
    start.getUTCDate() -
      daysSinceMonday
  );

  start.setUTCHours(
    0,
    0,
    0,
    0
  );

  return start;
};


// =========================================================
// CREATE GROUP
// POST /api/groups
// =========================================================

router.post(
  "/",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        name,
        description = "",
        visibility = "private",
      } = req.body;

      if (
        !name ||
        typeof name !==
          "string" ||
        !name.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Group name is required",
          });
      }

      if (
        typeof description !==
        "string"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Description must be text",
          });
      }

      if (
        ![
          "private",
          "public",
        ].includes(
          visibility
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group visibility",
          });
      }

      const inviteCode =
        await generateUniqueInviteCode();

      const group =
        await Group.create({
          name:
            name.trim(),

          description:
            description.trim(),

          ownerId:
            req.user.uid,

          inviteCode,

          visibility,
        });

      try {
        await GroupMember.create({
          groupId:
            group._id,

          userId:
            req.user.uid,

          role:
            "owner",

          displayName:
            req.user.name,

          picture:
            req.user.picture,
        });
      } catch (
        memberError
      ) {
        await Group.findByIdAndDelete(
          group._id
        );

        throw memberError;
      }

      return res
        .status(201)
        .json({
          message:
            "Group created successfully",

          group,
        });
    } catch (error) {
      console.error(
        "CREATE GROUP ERROR:",
        error.message
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res
          .status(400)
          .json({
            message:
              error.message,
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to create group",
        });
    }
  }
);


// =========================================================
// GET MY GROUPS
// GET /api/groups/mine
// =========================================================

router.get(
  "/mine",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const memberships =
        await GroupMember.find({
          userId:
            req.user.uid,
        }).lean();

      if (
        memberships.length ===
        0
      ) {
        return res.json({
          groups: [],
        });
      }

      const groupIds =
        memberships.map(
          (
            membership
          ) =>
            membership.groupId
        );

      const groups =
        await Group.find({
          _id: {
            $in:
              groupIds,
          },
        })
          .sort({
            updatedAt:
              -1,
          })
          .lean();

      const roleByGroupId =
        new Map();

      for (
        const membership
        of memberships
      ) {
        roleByGroupId.set(
          membership
            .groupId
            .toString(),

          membership.role
        );
      }

      const result =
        groups.map(
          (
            group
          ) => ({
            ...group,

            role:
              roleByGroupId.get(
                group
                  ._id
                  .toString()
              ),
          })
        );

      return res.json({
        groups:
          result,
      });
    } catch (error) {
      console.error(
        "GET MY GROUPS ERROR:",
        error.message
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to load groups",
        });
    }
  }
);


// =========================================================
// JOIN GROUP
// POST /api/groups/join
// =========================================================

router.post(
  "/join",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        inviteCode,
      } = req.body;

      if (
        !inviteCode ||
        typeof inviteCode !==
          "string" ||
        !inviteCode.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invite code is required",
          });
      }

      const normalizedCode =
        inviteCode
          .trim()
          .toUpperCase();

      const group =
        await Group.findOne({
          inviteCode:
            normalizedCode,
        });

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Invalid invite code",
          });
      }

      const existingMember =
        await GroupMember.findOne({
          groupId:
            group._id,

          userId:
            req.user.uid,
        });

      if (
        existingMember
      ) {
        return res
          .status(409)
          .json({
            message:
              "You are already a member of this group",
          });
      }

      const member =
        await GroupMember.create({
          groupId:
            group._id,

          userId:
            req.user.uid,

          role:
            "member",

          displayName:
            req.user.name,

          picture:
            req.user.picture,
        });

      try {
        await Group.findByIdAndUpdate(
          group._id,
          {
            $inc: {
              memberCount:
                1,
            },
          }
        );
      } catch (
        countError
      ) {
        await GroupMember.findByIdAndDelete(
          member._id
        );

        throw countError;
      }

      return res
        .status(201)
        .json({
          message:
            "Joined group successfully",

          group: {
            ...group.toObject(),

            memberCount:
              group.memberCount +
              1,

            role:
              "member",
          },
        });
    } catch (error) {
      console.error(
        "JOIN GROUP ERROR:",
        error.message
      );

      if (
        error.code ===
        11000
      ) {
        return res
          .status(409)
          .json({
            message:
              "You are already a member of this group",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to join group",
        });
    }
  }
);


// =========================================================
// GET GROUP MESSAGES
// GET /api/groups/:groupId/messages
// =========================================================

router.get(
  "/:groupId/messages",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } = req.params;


      // -----------------------------------------------------
      // GROUP
      // -----------------------------------------------------

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }


      // -----------------------------------------------------
      // MEMBERSHIP
      // -----------------------------------------------------

      const membership =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (!membership) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }


      // -----------------------------------------------------
      // LOAD LATEST MESSAGES
      //
      // $ne means:
      // exclude messages where the current UID exists inside
      // deletedFor[].
      //
      // Older messages without deletedFor still work.
      // -----------------------------------------------------

      const newestMessages =
        await GroupMessage.find({
          groupId,

          deletedFor: {
            $ne:
              req.user.uid,
          },
        })
          .select(
            "-deletedFor"
          )
          .sort({
            createdAt:
              -1,
          })
          .limit(50)
          .lean();


      // -----------------------------------------------------
      // API should return chronological order.
      // -----------------------------------------------------

      const messages =
        newestMessages
          .reverse()
          .map(
            (
              message
            ) => {
              if (
                message.isUnsent
              ) {
                return {
                  ...message,

                  message:
                    null,
                };
              }

              return message;
            }
          );


      return res.json({
        group: {
          _id:
            group._id,

          name:
            group.name,
        },

        messages,
      });
    } catch (error) {
      console.error(
        "GET GROUP MESSAGES ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to load group messages",
        });
    }
  }
);



// =========================================================
// GET ONE GROUP MESSAGE
// GET /api/groups/:groupId/messages/:messageId
//
// Used when a reply points to an older message that is not
// inside the latest loaded message window.
// =========================================================

router.get(
  "/:groupId/messages/:messageId",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
        messageId,
      } = req.params;


      // -----------------------------------------------------
      // GROUP
      // -----------------------------------------------------

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }


      // -----------------------------------------------------
      // MEMBERSHIP
      // -----------------------------------------------------

      const membership =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (!membership) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }


      // -----------------------------------------------------
      // MESSAGE
      // -----------------------------------------------------

      const message =
        await GroupMessage.findOne({
          _id:
            messageId,

          groupId,

          deletedFor: {
            $ne:
              req.user.uid,
          },
        })
          .select(
            "-deletedFor"
          )
          .lean();


      if (!message) {
        return res
          .status(404)
          .json({
            message:
              "Message not found",
          });
      }


      const safeMessage =
        message.isUnsent
          ? {
              ...message,

              message:
                null,
            }
          : message;


      return res.json({
        message:
          safeMessage,
      });
    } catch (error) {
      console.error(
        "GET GROUP MESSAGE ERROR:",
        error.message
      );


      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group or message ID",
          });
      }


      return res
        .status(500)
        .json({
          message:
            "Failed to load group message",
        });
    }
  }
);

// =========================================================
// GROUP LEADERBOARD
// GET /api/groups/:groupId/leaderboard
//
// Monday 00:00 UTC -> next Monday
// =========================================================

router.get(
  "/:groupId/leaderboard",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } = req.params;

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }

      const requesterMembership =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (
        !requesterMembership
      ) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }

      const members =
        await GroupMember.find({
          groupId,
        })
          .sort({
            joinedAt:
              1,
          })
          .lean();

      const memberUserIds =
        members.map(
          (
            member
          ) =>
            member.userId
        );

      const weekStart =
        getStartOfWeek();

      const weekEnd =
        new Date(
          weekStart
        );

      weekEnd.setUTCDate(
        weekEnd.getUTCDate() +
          7
      );

      let totals =
        [];

      if (
        memberUserIds.length >
        0
      ) {
        totals =
          await GroupStudySession.aggregate(
            [
              {
                $match: {
                  groupId:
                    group._id,

                  userId: {
                    $in:
                      memberUserIds,
                  },

                  endedAt: {
                    $gte:
                      weekStart,

                    $lt:
                      weekEnd,
                  },
                },
              },

              {
                $group: {
                  _id:
                    "$userId",

                  totalSeconds: {
                    $sum:
                      "$durationSeconds",
                  },

                  sessionCount: {
                    $sum:
                      1,
                  },

                  lastSessionAt: {
                    $max:
                      "$endedAt",
                  },
                },
              },
            ]
          );
      }

      const totalsByUserId =
        new Map();

      for (
        const row
        of totals
      ) {
        totalsByUserId.set(
          row._id,
          row
        );
      }

      const leaderboard =
        members
          .map(
            (
              member
            ) => {
              const total =
                totalsByUserId.get(
                  member.userId
                );

              return {
                userId:
                  member.userId,

                displayName:
                  member.displayName ||
                  "StudyOS User",

                picture:
                  member.picture ||
                  null,

                role:
                  member.role,

                totalSeconds:
                  total
                    ?.totalSeconds ||
                  0,

                sessionCount:
                  total
                    ?.sessionCount ||
                  0,

                lastSessionAt:
                  total
                    ?.lastSessionAt ||
                  null,
              };
            }
          )
          .sort(
            (
              first,
              second
            ) => {
              if (
                second.totalSeconds !==
                first.totalSeconds
              ) {
                return (
                  second.totalSeconds -
                  first.totalSeconds
                );
              }

              if (
                second.sessionCount !==
                first.sessionCount
              ) {
                return (
                  second.sessionCount -
                  first.sessionCount
                );
              }

              return (
                first.displayName ||
                ""
              ).localeCompare(
                second.displayName ||
                  ""
              );
            }
          )
          .map(
            (
              entry,
              index
            ) => ({
              rank:
                index + 1,

              ...entry,

              isCurrentUser:
                entry.userId ===
                req.user.uid,
            })
          );

      return res.json({
        group: {
          _id:
            group._id,

          name:
            group.name,
        },

        period: {
          type:
            "week",

          startsAt:
            weekStart,

          endsAt:
            weekEnd,
        },

        generatedAt:
          new Date(),

        leaderboard,
      });
    } catch (error) {
      console.error(
        "GROUP LEADERBOARD ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to load group leaderboard",
        });
    }
  }
);


// =========================================================
// GET GROUP MEMBERS
// GET /api/groups/:groupId/members
// =========================================================

router.get(
  "/:groupId/members",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } = req.params;

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }

      const requesterMembership =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (
        !requesterMembership
      ) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }

      const members =
        await GroupMember.find({
          groupId,
        })
          .sort({
            joinedAt:
              1,
          })
          .lean();

      return res.json({
        group: {
          _id:
            group._id,

          name:
            group.name,

          memberCount:
            group.memberCount,
        },

        members,
      });
    } catch (error) {
      console.error(
        "GET GROUP MEMBERS ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to load group members",
        });
    }
  }
);


// =========================================================
// CHANGE MEMBER ROLE
// PATCH /api/groups/:groupId/members/:targetUserId/role
// OWNER ONLY
// =========================================================

router.patch(
  "/:groupId/members/:targetUserId/role",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
        targetUserId,
      } = req.params;

      const {
        role,
      } = req.body;

      if (
        ![
          "admin",
          "member",
        ].includes(
          role
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Role must be admin or member",
          });
      }

      const requester =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (
        !requester ||
        requester.role !==
          "owner"
      ) {
        return res
          .status(403)
          .json({
            message:
              "Only the group owner can change roles",
          });
      }

      const target =
        await GroupMember.findOne({
          groupId,

          userId:
            targetUserId,
        });

      if (!target) {
        return res
          .status(404)
          .json({
            message:
              "Member not found",
          });
      }

      if (
        target.role ===
        "owner"
      ) {
        return res
          .status(403)
          .json({
            message:
              "Owner role cannot be changed",
          });
      }

      target.role =
        role;

      await target.save();

      return res.json({
        message:
          `Member role changed to ${role}`,

        member:
          target,
      });
    } catch (error) {
      console.error(
        "CHANGE MEMBER ROLE ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to change member role",
        });
    }
  }
);


// =========================================================
// REMOVE MEMBER
// DELETE /api/groups/:groupId/members/:targetUserId
//
// OWNER:
// remove admin/member
//
// ADMIN:
// remove member
// =========================================================

router.delete(
  "/:groupId/members/:targetUserId",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
        targetUserId,
      } = req.params;

      if (
        targetUserId ===
        req.user.uid
      ) {
        return res
          .status(400)
          .json({
            message:
              "Use the leave group endpoint to leave",
          });
      }

      const requester =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (!requester) {
        return res
          .status(403)
          .json({
            message:
              "You are not a member of this group",
          });
      }

      if (
        ![
          "owner",
          "admin",
        ].includes(
          requester.role
        )
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have permission to remove members",
          });
      }

      const target =
        await GroupMember.findOne({
          groupId,

          userId:
            targetUserId,
        });

      if (!target) {
        return res
          .status(404)
          .json({
            message:
              "Member not found",
          });
      }

      if (
        target.role ===
        "owner"
      ) {
        return res
          .status(403)
          .json({
            message:
              "Group owner cannot be removed",
          });
      }

      if (
        requester.role ===
          "admin" &&
        target.role !==
          "member"
      ) {
        return res
          .status(403)
          .json({
            message:
              "Admins can only remove regular members",
          });
      }

      await GroupMember.deleteOne({
        _id:
          target._id,
      });

      await LiveSession.deleteMany({
        groupId,

        userId:
          targetUserId,
      });

      await Group.findByIdAndUpdate(
        groupId,
        {
          $inc: {
            memberCount:
              -1,
          },
        }
      );

      return res.json({
        message:
          "Member removed successfully",
      });
    } catch (error) {
      console.error(
        "REMOVE MEMBER ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to remove member",
        });
    }
  }
);


// =========================================================
// REGENERATE INVITE CODE
// POST /api/groups/:groupId/invite-code/regenerate
// OWNER / ADMIN
// =========================================================

router.post(
  "/:groupId/invite-code/regenerate",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } = req.params;

      const membership =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (
        !membership ||
        ![
          "owner",
          "admin",
        ].includes(
          membership.role
        )
      ) {
        return res
          .status(403)
          .json({
            message:
              "You do not have permission to regenerate the invite code",
          });
      }

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }

      const inviteCode =
        await generateUniqueInviteCode();

      group.inviteCode =
        inviteCode;

      await group.save();

      return res.json({
        message:
          "Invite code regenerated successfully",

        inviteCode,
      });
    } catch (error) {
      console.error(
        "REGENERATE INVITE CODE ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to regenerate invite code",
        });
    }
  }
);


// =========================================================
// LEAVE GROUP
// DELETE /api/groups/:groupId/leave
// =========================================================

router.delete(
  "/:groupId/leave",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } = req.params;

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }

      const membership =
        await GroupMember.findOne({
          groupId,

          userId:
            req.user.uid,
        });

      if (!membership) {
        return res
          .status(404)
          .json({
            message:
              "You are not a member of this group",
          });
      }

      if (
        membership.role ===
        "owner"
      ) {
        return res
          .status(403)
          .json({
            message:
              "Group owner cannot leave the group",
          });
      }

      await GroupMember.deleteOne({
        _id:
          membership._id,
      });

      await LiveSession.deleteMany({
        groupId,

        userId:
          req.user.uid,
      });

      await Group.findByIdAndUpdate(
        groupId,
        {
          $inc: {
            memberCount:
              -1,
          },
        }
      );

      return res.json({
        message:
          "Left group successfully",
      });
    } catch (error) {
      console.error(
        "LEAVE GROUP ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to leave group",
        });
    }
  }
);


// =========================================================
// DELETE GROUP
// DELETE /api/groups/:groupId
// OWNER ONLY
// =========================================================

router.delete(
  "/:groupId",
  firebaseAuth,
  async (
    req,
    res
  ) => {
    try {
      const {
        groupId,
      } = req.params;

      const group =
        await Group.findById(
          groupId
        );

      if (!group) {
        return res
          .status(404)
          .json({
            message:
              "Group not found",
          });
      }

      if (
        group.ownerId !==
        req.user.uid
      ) {
        return res
          .status(403)
          .json({
            message:
              "Only the group owner can delete the group",
          });
      }


      // -----------------------------------------------------
      // CLEAN UP ALL GROUP DATA
      // -----------------------------------------------------

      await Promise.all([
        GroupMember.deleteMany({
          groupId,
        }),

        LiveSession.deleteMany({
          groupId,
        }),

        GroupStudySession.deleteMany({
          groupId,
        }),

        GroupMessage.deleteMany({
          groupId,
        }),
      ]);


      await Group.deleteOne({
        _id:
          groupId,
      });

      return res.json({
        message:
          "Group deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE GROUP ERROR:",
        error.message
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid group ID",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Failed to delete group",
        });
    }
  }
);


module.exports =
  router;


