const AI_FEATURES = {
    conversational: true,
    readAttachments: false,
    generateFiles: false
};

function isAiFeatureEnabled(featureName) {
    return !!AI_FEATURES[featureName];
}

module.exports = {
    AI_FEATURES,
    isAiFeatureEnabled
};
