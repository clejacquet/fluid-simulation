cmake_minimum_required(VERSION 3.5)
project(Wtr)

#set(OpenGL_GL_PREFERENCE GLVND)

set(CMAKE_CXX_STANDARD 17)

find_package(SFML 2.5 COMPONENTS system graphics window audio REQUIRED)
find_package(OpenGL)
find_package(GLEW)
find_package(glm)

include_directories(${CMAKE_SOURCE_DIR}/src)

add_executable(wtr
     src/main.cpp
     src/graphic_shader.cpp
     src/compute_shader.cpp
)

set(CMAKE_CXX_FLAGS  "${CMAKE_CXX_FLAGS} -g")

target_link_libraries(wtr ${GLEW_LIBRARY} ${OPENGL_LIBRARIES} sfml-graphics sfml-window sfml-system)