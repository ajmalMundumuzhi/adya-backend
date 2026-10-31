
const crypto = require("crypto");
const repository = require("./payment.settings.repository");

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const key = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY;

  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error(
      "PAYMENT_SETTINGS_ENCRYPTION_KEY must be a 64-character hexadecimal key"
    );
  }

  return Buffer.from(key, "hex");
}

function encryptSecret(value) {
  if (!value) return "";

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);

  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex")
  ].join(":");
}

function decryptSecret(value) {
  if (!value) return "";

  const [iv, authTag, encrypted] = value.split(":");

  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted payment credential");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

async function getOrCreateSettings() {
  return repository.findSettings();
}

function formatAdminSettings(settings) {
  return {
    stripe: {
      enabled: settings.stripe.enabled,
      mode: settings.stripe.mode,
      secretKeyConfigured: Boolean(
        settings.stripe.secretKeyEncrypted
      ),
      webhookSecretConfigured: Boolean(
        settings.stripe.webhookSecretEncrypted
      )
    },
    cod: {
      enabled: settings.cod.enabled,
      minimumOrderAmount: settings.cod.minimumOrderAmount,
      maximumOrderAmount: settings.cod.maximumOrderAmount,
      additionalCharge: settings.cod.additionalCharge
    },
    defaultCurrency: settings.defaultCurrency,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt
  };
}

function formatPublicSettings(settings) {
  return {
    stripe: {
      enabled: settings.stripe.enabled,
      mode: settings.stripe.mode
    },
    cod: {
      enabled: settings.cod.enabled,
      minimumOrderAmount: settings.cod.minimumOrderAmount,
      maximumOrderAmount: settings.cod.maximumOrderAmount,
      additionalCharge: settings.cod.additionalCharge
    },
    defaultCurrency: settings.defaultCurrency
  };
}

async function getPaymentSettings() {
  const settings = await getOrCreateSettings();
  return formatAdminSettings(settings);
}

async function getPublicPaymentSettings() {
  const settings = await getOrCreateSettings();
  return formatPublicSettings(settings);
}

async function updatePaymentSettings(data) {
  const settings = await getOrCreateSettings();

  const updateData = {};

  if (data.stripe) {
    const stripe = { ...data.stripe };

    const secretKey = stripe.secretKey;
    const webhookSecret = stripe.webhookSecret;

    delete stripe.secretKey;
    delete stripe.webhookSecret;

    updateData.stripe = {
      ...settings.stripe,
      ...stripe
    };

    if (secretKey) {
      updateData.stripe.secretKeyEncrypted =
        encryptSecret(secretKey);
    }

    if (webhookSecret) {
      updateData.stripe.webhookSecretEncrypted =
        encryptSecret(webhookSecret);
    }
  }

  if (data.cod) {
    updateData.cod = {
      ...settings.cod,
      ...data.cod
    };
  }

  if (data.defaultCurrency) {
    updateData.defaultCurrency = data.defaultCurrency;
  }

  const resultingCod = {
    ...settings.cod,
    ...(updateData.cod || {})
  };

  if (
    resultingCod.maximumOrderAmount <
    resultingCod.minimumOrderAmount
  ) {
    const error = new Error(
      "Maximum COD amount cannot be less than minimum COD amount"
    );
    error.statusCode = 400;
    throw error;
  }

  await repository.updateSettings(settings, updateData);

  return formatAdminSettings(settings);
}

async function getStripeCredentials() {
  const settings = await getOrCreateSettings();

  return {
    enabled: settings.stripe.enabled,
    mode: settings.stripe.mode,
    secretKey: decryptSecret(
      settings.stripe.secretKeyEncrypted
    ),
    webhookSecret: decryptSecret(
      settings.stripe.webhookSecretEncrypted
    )
  };
}

module.exports = {
  getPaymentSettings,
  getPublicPaymentSettings,
  updatePaymentSettings,
  getStripeCredentials
};
