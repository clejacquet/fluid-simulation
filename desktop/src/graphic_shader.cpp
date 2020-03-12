#include "gl_check.h"
#include "graphic_shader.h"

GraphicShader::GraphicShader(const char* vertex_path, const char* fragment_path) {
    // 1. retrieve the vertex/fragment source code from filePath
    std::string vertex_code;
    std::string fragment_code;
    std::ifstream vert_shader_file;
    std::ifstream frag_shader_file;

    // ensure ifstream objects can throw exceptions:
    vert_shader_file.exceptions (std::ifstream::failbit | std::ifstream::badbit);
    frag_shader_file.exceptions (std::ifstream::failbit | std::ifstream::badbit);
    
    try {
        // open files
        vert_shader_file.open(vertex_path);
        frag_shader_file.open(fragment_path);
        std::stringstream vert_shader_stream, frag_shaderStream;
        // read file's buffer contents into streams
        vert_shader_stream << vert_shader_file.rdbuf();
        frag_shaderStream << frag_shader_file.rdbuf();		
        // close file handlers
        vert_shader_file.close();
        frag_shader_file.close();
        // convert stream into string
        vertex_code = vert_shader_stream.str();
        fragment_code = frag_shaderStream.str();		
    } catch(std::ifstream::failure err) {
        std::cout << "ERROR::SHADER::FILE_NOT_SUCCESFULLY_READ" << std::endl;
    }

    const char* vert_shader_code = vertex_code.c_str();
    const char* frag_shader_code = fragment_code.c_str();

    // 2. compile shaders
    unsigned int vertex, fragment;
    int success;
    char info_log[512];
    
    // vertex Shader
    vertex = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertex, 1, &vert_shader_code, NULL);
    glCompileShader(vertex);
    // print compile errors if any
    glGetShaderiv(vertex, GL_COMPILE_STATUS, &success);
    if(!success) {
        glGetShaderInfoLog(vertex, 512, NULL, info_log);
        std::cout << "ERROR::SHADER::VERTEX::COMPILATION_FAILED\n" << info_log << std::endl;
    };
    
    // similiar for Fragment Shader
    fragment = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragment, 1, &frag_shader_code, NULL);
    glCompileShader(fragment);
    // print compile errors if any
    glGetShaderiv(fragment, GL_COMPILE_STATUS, &success);
    if(!success) {
        glGetShaderInfoLog(fragment, 512, NULL, info_log);
        std::cout << "ERROR::SHADER::FRAGMENT::COMPILATION_FAILED\n" << info_log << std::endl;
    };
    
    // shader Program
    _program_id = glCreateProgram();
    glAttachShader(_program_id, vertex);
    glAttachShader(_program_id, fragment);
    glLinkProgram(_program_id);
    // print linking errors if any
    glGetProgramiv(_program_id, GL_LINK_STATUS, &success);
    if(!success)
    {
        glGetProgramInfoLog(_program_id, 512, NULL, info_log);
        std::cout << "ERROR::SHADER::PROGRAM::LINKING_FAILED\n" << info_log << std::endl;
    }
    
    // delete the shaders as they're linked into our program now and no longer necessery
    glDeleteShader(vertex);
    glDeleteShader(fragment);
}

GraphicShader::~GraphicShader() {
    glCheckError(glDeleteProgram(_program_id));
}


void GraphicShader::use() const { 
    glCheckError(glUseProgram(_program_id));
}

void GraphicShader::setBool(const std::string &name, bool value) const {
    glCheckError(glUniform1i(glGetUniformLocation(_program_id, name.c_str()), (int)value));
}

void GraphicShader::setInt(const std::string &name, int value) const { 
    glCheckError(glUniform1i(glGetUniformLocation(_program_id, name.c_str()), value));
}

void GraphicShader::setFloat(const std::string &name, float value) const {
    glCheckError(glUniform1f(glGetUniformLocation(_program_id, name.c_str()), value));
} 