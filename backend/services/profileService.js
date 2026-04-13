const { User } = require('../models');
const { plain } = require('../utils/http');

async function currentUserProfile(username) {
  const user = await User.findOne({
    where: { username },
    attributes: [
      'username',
      'display_name',
      'email',
      'bio',
      'location',
      'timezone',
      'avatar_color',
      'fitness_goal',
      'diet_goal',
      'learning_goal',
      'game_handle',
      'privacy_level',
      'created_at'
    ]
  });

  if (!user) return null;
  const profile = plain(user);
  return { ...profile, display_name: profile.display_name || profile.username };
}

module.exports = {
  currentUserProfile
};
