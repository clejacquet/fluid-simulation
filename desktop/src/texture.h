#ifndef TEXTURE_H
#define TEXTURE_H

#include <memory>
#include <GL/glew.h>

class Texture {
private:
    unsigned _texture_id;
    GLenum _inner_format;
    GLenum _format;
    GLenum _type;

public:
    Texture(int width, int height, GLenum inner_format, GLenum format, GLenum type) :
        _inner_format(inner_format),
        _format(format),
        _type(type)
    {
        glCheckError(glGenTextures(1, &_texture_id));

        glCheckError(glBindTexture(GL_TEXTURE_2D, _texture_id));
        glCheckError(glTexImage2D(GL_TEXTURE_2D, 0, inner_format, width, height, 0, format, type, nullptr));

        glCheckError(glTexStorage2D(GL_TEXTURE_2D, 1, inner_format, width, height));

        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR));
        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR));
        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE));
        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE));
        glCheckError(glBindTexture(GL_TEXTURE_2D, 0));
    }

    Texture(int width, int height, GLenum inner_format, GLenum format, GLenum type, unsigned char* data) :
        _inner_format(inner_format),
        _format(format),
        _type(type)
    {
        glCheckError(glGenTextures(1, &_texture_id));

        glCheckError(glBindTexture(GL_TEXTURE_2D, _texture_id));
        glCheckError(glTexImage2D(GL_TEXTURE_2D, 0, inner_format, width, height, 0, format, type, data));

        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR));
        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR));
        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE));
        glCheckError(glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE));
        glCheckError(glBindTexture(GL_TEXTURE_2D, 0));
    }

    ~Texture() {
        glCheckError(glBindTexture(GL_TEXTURE_2D, 0));
        glCheckError(glDeleteTextures(1, &_texture_id));
    }

    unsigned getID() const {
        return _texture_id;
    }

    void resize(int width, int height) {
        glCheckError(glBindTexture(GL_TEXTURE_2D, _texture_id));
        glCheckError(glTexImage2D(GL_TEXTURE_2D, 0, _inner_format, width, height, 0, _format, _type, nullptr));
        glCheckError(glBindTexture(GL_TEXTURE_2D, 0));
    }
};


#endif