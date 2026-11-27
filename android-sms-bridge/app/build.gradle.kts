plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.kcc.smsbridge"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kcc.smsbridge"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "1.2.0"
    }

    signingConfigs {
        create("releaseSigning") {
            val ksPath = System.getenv("KEYSTORE_PATH")
            if (!ksPath.isNullOrBlank() && file(ksPath).exists()) {
                storeFile = file(ksPath)
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "kcc1234"
                keyAlias = System.getenv("KEY_ALIAS") ?: "kcc"
                keyPassword = System.getenv("KEY_PASSWORD") ?: "kcc1234"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            val ksPath = System.getenv("KEYSTORE_PATH")
            signingConfig = if (!ksPath.isNullOrBlank() && file(ksPath).exists()) {
                signingConfigs.getByName("releaseSigning")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
}
