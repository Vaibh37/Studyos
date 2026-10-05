const mongoose =
  require("mongoose");

const socialDB =
  mongoose.createConnection();

const connectSocialDB =
  async () => {
    try {
      await socialDB.openUri(
        process.env.MONGO_SOCIAL_URI
      );

      console.log(
        "Social MongoDB connected successfully ?"
      );
    } catch (error) {
      console.error(
        "Social MongoDB connection failed:",
        error.message
      );

      process.exit(1);
    }
  };

module.exports = {
  socialDB,
  connectSocialDB,
};
