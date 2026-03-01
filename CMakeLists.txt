cmake_minimum_required(VERSION 3.27)
project(physiology_server_redis)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenCV REQUIRED COMPONENTS core imgcodecs imgproc highgui)
find_package(CURL REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(V4L REQUIRED)
find_package(OpenGL REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(HIREDIS REQUIRED hiredis)

include_directories(${HIREDIS_INCLUDE_DIRS})

add_executable(physiology_server_redis physiology_server_redis.cpp)

target_link_libraries(physiology_server_redis
    PUBLIC
    smartspectra::smartspectra
    ${OpenCV_LIBS}
    ${CURL_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    ${HIREDIS_LIBRARIES}
    OpenGL::OpenGL
)
