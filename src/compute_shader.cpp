#include "gl_check.h"

#include "compute_shader.h"


ComputeShader::ComputeShader(const char* path) {
    std::string compute_code;
    std::ifstream compute_shader_file;

    // ensure ifstream objects can throw exceptions:
    compute_shader_file.exceptions (std::ifstream::failbit | std::ifstream::badbit);
    
    try {
        // open files
        compute_shader_file.open(path);
        std::stringstream compute_shader_stream;
        // read file's buffer contents into streams
        compute_shader_stream << compute_shader_file.rdbuf();	
        // close file handlers
        compute_shader_file.close();
        // convert stream into string
        compute_code = compute_shader_stream.str();	
    } catch(std::ifstream::failure err) {
        std::cout << "ERROR::SHADER::FILE_NOT_SUCCESFULLY_READ" << std::endl;
    }

    const char* compute_shader_code = compute_code.c_str();

    // 2. compile shaders
    unsigned int compute;
    int success;
    char info_log[512];
    
    // Compute Shader
    compute = glCreateShader(GL_COMPUTE_SHADER);
    glShaderSource(compute, 1, &compute_shader_code, NULL);
    glCompileShader(compute);
    // print compile errors if any
    glGetShaderiv(compute, GL_COMPILE_STATUS, &success);
    if(!success) {
        glGetShaderInfoLog(compute, 512, NULL, info_log);
        std::cout << "ERROR::SHADER::COMPUTE::COMPILATION_FAILED\n" << info_log << std::endl;
    };
    
    // shader Program
    _program_id = glCreateProgram();
    glAttachShader(_program_id, compute);
    glLinkProgram(_program_id);
    // print linking errors if any
    glGetProgramiv(_program_id, GL_LINK_STATUS, &success);
    if(!success)
    {
        glGetProgramInfoLog(_program_id, 512, NULL, info_log);
        std::cout << "ERROR::SHADER::PROGRAM::LINKING_FAILED\n" << info_log << std::endl;
    }
    
    // delete the shaders as they're linked into our program now and no longer necessery
    glDeleteShader(compute);
}

ComputeShader::~ComputeShader() {
    glCheckError(glDeleteProgram(_program_id));
}


void ComputeShader::use() { 
    glCheckError(glUseProgram(_program_id));
}

void ComputeShader::setBool(const std::string &name, bool value) const {
    glCheckError(glUniform1i(glGetUniformLocation(_program_id, name.c_str()), (int)value)); 
}

void ComputeShader::setInt(const std::string &name, int value) const {
    glCheckError(glUniform1i(glGetUniformLocation(_program_id, name.c_str()), value)); 
}

void ComputeShader::setFloat(const std::string &name, float value) const {
    glCheckError(glUniform1f(glGetUniformLocation(_program_id, name.c_str()), value));
}

void ComputeShader::setVec2(const std::string &name, const glm::vec2& value) const {
    glCheckError(glUniform2f(glGetUniformLocation(_program_id, name.c_str()), value.x, value.y));
}

void ComputeShader::setVec2i(const std::string &name, const glm::ivec2& value) const {
    glCheckError(glUniform2i(glGetUniformLocation(_program_id, name.c_str()), value.x, value.y));
}