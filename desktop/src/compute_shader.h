#ifndef COMPUTE_SHADER_H
#define COMPUTE_SHADER_H

#include <GL/glew.h>
  
#include <string>
#include <fstream>
#include <sstream>
#include <iostream>
  
#include <glm/vec2.hpp>

class ComputeShader {
private:
    unsigned int _program_id;

public:
    ComputeShader(const char* path);
    ~ComputeShader();

    void use();

    void setBool(const std::string &name, bool value) const;  
    void setInt(const std::string &name, int value) const;   
    void setFloat(const std::string &name, float value) const;
    void setVec2(const std::string &name, const glm::vec2& value) const;
    void setVec2i(const std::string &name, const glm::ivec2& value) const;
};
  
#endif