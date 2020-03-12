#ifndef SWAP_TEXTURE_H
#define SWAP_TEXTURE_H

#include "texture.h"


class SwapTexture {
private:
    Texture _texture1;
    Texture _texture2;
    Texture* _src;
    Texture* _dst;

public:
    SwapTexture(int width, int height, GLenum inner_format, GLenum format, GLenum type, unsigned char* data) :
        _texture1(width, height, inner_format, format, type, data),
        _texture2(width, height, inner_format, format, type, data),
        _src(&_texture1),
        _dst(&_texture2)
    {
    }

    SwapTexture(int width, int height, GLenum inner_format, GLenum format, GLenum type) :
        _texture1(width, height, inner_format, format, type),
        _texture2(width, height, inner_format, format, type),
        _src(&_texture1),
        _dst(&_texture2)
    {
    }

    Texture& src() {
        return *_src;
    }

    const Texture& src() const {
        return *_src;
    }

    Texture& dst() {
        return *_dst;
    }
    
    const Texture& dst() const {
        return *_dst;
    }

    void swap() {
        std::swap(_src, _dst);
    }
};


#endif