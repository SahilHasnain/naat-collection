FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/build-tools/35.0.0:/root/.local/share/gem/ruby/3.2.0/bin"

RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    zip \
    jq \
    ca-certificates \
    build-essential \
    openjdk-17-jdk \
    ruby-full \
    ruby-dev \
    libssl-dev \
    libreadline-dev \
    zlib1g-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/android-ci

COPY scripts/install-android-sdk.sh /opt/android-ci/scripts/install-android-sdk.sh
COPY scripts/start-runner.sh /opt/android-ci/scripts/start-runner.sh

RUN chmod +x /opt/android-ci/scripts/install-android-sdk.sh /opt/android-ci/scripts/start-runner.sh \
    && /opt/android-ci/scripts/install-android-sdk.sh \
    && gem install bundler fastlane --no-document

CMD ["/opt/android-ci/scripts/start-runner.sh"]
