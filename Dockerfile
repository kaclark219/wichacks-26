FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    gpg curl build-essential git lsb-release \
    libcurl4-openssl-dev libssl-dev pkg-config \
    libv4l-dev libgles2-mesa-dev libunwind-dev \
    libhiredis-dev wget ca-certificates \
    software-properties-common && \
    rm -rf /var/lib/apt/lists/*

RUN curl -L -o /tmp/cmake-3.27.0-linux-x86_64.sh \
    https://github.com/Kitware/CMake/releases/download/v3.27.0/cmake-3.27.0-linux-x86_64.sh && \
    chmod +x /tmp/cmake-3.27.0-linux-x86_64.sh && \
    /tmp/cmake-3.27.0-linux-x86_64.sh --skip-license --prefix=/usr/local && \
    rm /tmp/cmake-3.27.0-linux-x86_64.sh

RUN curl -s "https://presage-security.github.io/PPA/KEY.gpg" | gpg --dearmor > /etc/apt/trusted.gpg.d/presage-technologies.gpg && \
    curl -s --compressed -o /etc/apt/sources.list.d/presage-technologies.list \
    "https://presage-security.github.io/PPA/presage-technologies.list" && \
    apt-get update && apt-get install -y libsmartspectra-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY physiology_server_redis.cpp .
COPY CMakeLists.txt .

RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc) && \
    cp physiology_server_redis /app/

ENTRYPOINT ["/app/physiology_server_redis"]
