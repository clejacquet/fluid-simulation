#ifndef GRAPHIC_SHADER_H
#define GRAPHIC_SHADER_H

#include <GL/glew.h>
  
#include <string>
#include <fstream>
#include <sstream>
#include <iostream>
  

class GraphicShader {
private:
    unsigned int _program_id;

public:
    GraphicShader(const char* vertex_path, const char* fragment_path);
    ~GraphicShader();

    void use() const;

    void setBool(const std::string &name, bool value) const;  
    void setInt(const std::string &name, int value) const;   
    void setFloat(const std::string &name, float value) const;
};
  
#endif