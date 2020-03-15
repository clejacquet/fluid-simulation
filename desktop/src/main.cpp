#include <SFML/Graphics.hpp>
#include <GL/glew.h>
#include <glm/glm.hpp>
#include <iostream>
#include <thread>
#include <stdlib.h>
#include <time.h>

#include "gl_check.h"
#include "quad.h"
#include "graphic_shader.h"
#include "compute_shader.h"
#include "texture.h"
#include "swap_texture.h"


#define SIM_WIDTH 128
#define SIM_HEIGHT 128

#define SCREEN_WIDTH 1280
#define SCREEN_HEIGHT 720

#define COLOR_WIDTH 1024
#define COLOR_HEIGHT 1024

#define TIMESTEP (1.0f / 144.0f)

std::ostream& operator<<(std::ostream& oss, const glm::vec3& vec) {
    oss << "(" << vec.x << ", " << vec.y << ", " << vec.z << ")";
    return oss;
}


glm::vec3 HSVtoRGB(int H, double S, double V) {
	double C = S * V;
	double X = C * (1 - abs(fmod(H / 60.0, 2) - 1));
	double m = V - C;
	double Rs, Gs, Bs;

	if(H >= 0 && H < 60) {
		Rs = C;
		Gs = X;
		Bs = 0;	
	}
	else if(H >= 60 && H < 120) {	
		Rs = X;
		Gs = C;
		Bs = 0;	
	}
	else if(H >= 120 && H < 180) {
		Rs = 0;
		Gs = C;
		Bs = X;	
	}
	else if(H >= 180 && H < 240) {
		Rs = 0;
		Gs = X;
		Bs = C;	
	}
	else if(H >= 240 && H < 300) {
		Rs = X;
		Gs = 0;
		Bs = C;	
	}
	else {
		Rs = C;
		Gs = 0;
		Bs = X;	
	}
	
	return glm::vec3(Rs + m, Gs + m, Bs + m);
}

std::unique_ptr<unsigned char[]> generateTextureData(int width, int height) {
    auto data = std::make_unique<float[]>(4 * width * height);

    float max_distance = glm::length(glm::vec2(width * 0.5f, height * 0.5f));

    for (int j = 0; j < height; ++j) {
        for (int i = 0; i < width; ++i) {
            float distance = glm::distance(glm::vec2(width * 0.5f, height * 0.5f), glm::vec2(i, j)) / max_distance;

            data[4 * (j * width + i) + 0] = 0.0f;
            data[4 * (j * width + i) + 1] = 0.0f;
            data[4 * (j * width + i) + 2] = 0.0f;
            data[4 * (j * width + i) + 3] = 1.0f;
        }
    }

    return std::unique_ptr<unsigned char[]>((unsigned char*) data.release());
}

std::unique_ptr<unsigned char[]> generateVelocityData(int width, int height) {
    auto data = std::make_unique<float[]>(2.0f * width * height);

    for (int j = 0; j < height; ++j) {
        for (int i = 0; i < width; ++i) {
            data[j * width * 2 + i * 2 + 0] = 0.0f;
            data[j * width * 2 + i * 2 + 1] = 0.0f;
        }
    }

    return std::unique_ptr<unsigned char[]>((unsigned char*) data.release());
}

static void bindTextures(ComputeShader& shader, const SwapTexture& color, const SwapTexture& velocity, const SwapTexture& pressure, unsigned divergence_id) {
    glCheckError(glBindImageTexture(0, color.dst().getID(), 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_RGBA32F));
    glCheckError(glBindImageTexture(1, velocity.dst().getID(), 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_RG32F));
    glCheckError(glBindImageTexture(2, pressure.dst().getID(), 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));
    glCheckError(glBindImageTexture(3, divergence_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));

    glCheckError(glActiveTexture(GL_TEXTURE0));
    glCheckError(glBindTexture(GL_TEXTURE_2D, color.src().getID()));
    shader.setInt("color_sampler", 0);
    glCheckError(glActiveTexture(GL_TEXTURE1));
    glCheckError(glBindTexture(GL_TEXTURE_2D, velocity.src().getID()));
    shader.setInt("velocity_sampler", 1);
    glCheckError(glActiveTexture(GL_TEXTURE2));
    glCheckError(glBindTexture(GL_TEXTURE_2D, pressure.src().getID()));
    shader.setInt("pressure_sampler", 2);
    glCheckError(glActiveTexture(GL_TEXTURE3));
    glCheckError(glBindTexture(GL_TEXTURE_2D, divergence_id));
    shader.setInt("divergence_sampler", 3);
}

static void useComputeShader(int width, int height, glm::vec2 dx, const glm::vec3& splat_color, glm::vec2 force_dir, ComputeShader& shader, const SwapTexture& color, const SwapTexture& velocity, const SwapTexture& pressure, unsigned divergence_id) {
    // std::cout << splat_color << std::endl;
    
    shader.use();
    shader.setFloat("timestep", TIMESTEP);
    shader.setVec2("dx", dx);
    shader.setVec3("new_color", splat_color);
    shader.setVec2("force_dir", force_dir);
    shader.setFloat("viscosity", glm::length(dx) * 0.01f);
    shader.setBool("has_clicked", false);

    bindTextures(shader, color, velocity, pressure, divergence_id);

    glCheckError(glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT));
    glCheckError(glDispatchCompute(int(std::ceil(width / 16.0f)), int(std::ceil(height / 16.0f)), 1));

    glCheckError(glUseProgram(0));
}

void useComputeShader(int width, int height, glm::vec2 dx, const glm::vec3& splat_color, glm::vec2 force_dir, ComputeShader& shader, const SwapTexture& color, const SwapTexture& velocity, const SwapTexture& pressure, unsigned divergence_id, const glm::ivec2 &clic) {
    shader.use();
    shader.setFloat("timestep", TIMESTEP);
    shader.setVec2("dx", dx);
    shader.setVec3("new_color", splat_color);
    shader.setVec2("force_dir", force_dir);
    shader.setFloat("viscosity", glm::length(dx) * 0.01f);
    shader.setBool("has_clicked", true);
    shader.setVec2i("click_pos", clic);

    bindTextures(shader, color, velocity, pressure, divergence_id);

    glCheckError(glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT));
    glCheckError(glDispatchCompute(width / 16, height / 16, 1));

    glCheckError(glUseProgram(0));
}

enum ViewState {
    COLOR = 0,
    VELOCITY = 1,
    COUNT
};

static void displayTexture(const Quad& quad, const GraphicShader& shader, const Texture& texture) {
    glCheckError(glBindVertexArray(quad.getVAO()));
    shader.use();

    glCheckError(glActiveTexture(GL_TEXTURE0));
    glCheckError(glBindTexture(GL_TEXTURE_2D, texture.getID()));
    shader.setInt("tex", 0);
}

static glm::vec3 generateRandomColor() {
    int angle = std::rand() % 360;

    return HSVtoRGB(angle, 1.0f, 1.0f);
}



int main() {
    std::srand(std::time(nullptr));

    sf::ContextSettings settings;
    settings.majorVersion = 4;
    settings.minorVersion = 3;

    sf::RenderWindow window(sf::VideoMode(SCREEN_WIDTH, SCREEN_HEIGHT), "Wtr", sf::Style::Titlebar | sf::Style::Close | sf::Style::Resize, settings);

    if (glewInit() != GLEW_OK) {
        std::cerr << "Failed to initialize GLEW" << std::endl;
        return 1;
    }

    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);

    Quad quad;
    GraphicShader color_shader("shaders/vertex/simple.glsl", "shaders/fragment/color.glsl");
    GraphicShader velocity_shader("shaders/vertex/simple.glsl", "shaders/fragment/velocity.glsl");

    ViewState state = ViewState::COLOR;


    ComputeShader advect_boundary_shader("shaders/compute/advect_boundary.glsl");
    ComputeShader advect_shader("shaders/compute/advect.glsl");
    ComputeShader advect_color_shader("shaders/compute/advect_color.glsl");
    ComputeShader set_color_shader("shaders/compute/set_color.glsl");
    ComputeShader apply_force_shader("shaders/compute/apply_force.glsl");
    ComputeShader diffuse_shader("shaders/compute/diffuse.glsl");
    ComputeShader divergence_calc_shader("shaders/compute/divergence_calc.glsl");
    ComputeShader gradient_sub_shader("shaders/compute/gradient_sub.glsl");
    ComputeShader pressure_boundary_shader("shaders/compute/pressure_boundary.glsl");
    ComputeShader pressure_solve_shader("shaders/compute/pressure_solve.glsl");

    auto color_data = generateTextureData(COLOR_WIDTH, COLOR_HEIGHT);
    auto velocity_data = generateVelocityData(SIM_WIDTH, SIM_HEIGHT);


    SwapTexture color(COLOR_WIDTH, COLOR_HEIGHT, GL_RGBA32F, GL_RGBA, GL_FLOAT, color_data.get());

    SwapTexture velocity(SIM_WIDTH, SIM_HEIGHT, GL_RG32F, GL_RG, GL_FLOAT, velocity_data.get());

    SwapTexture pressure(SIM_WIDTH, SIM_HEIGHT, GL_R32F, GL_RED, GL_FLOAT);

    Texture divergence(SIM_WIDTH, SIM_HEIGHT, GL_R32F, GL_RED, GL_FLOAT);


    bool active = true;

    glm::ivec2 click_pos, color_click_pos;

    int window_width = SCREEN_WIDTH;
    int window_height = SCREEN_HEIGHT;

    bool mouse_down = false;
    glm::vec2 force_dir;
    glm::ivec2 last_cursor_pos;

    glm::vec2 dx = 100.0f / glm::vec2(window_width - 1, window_height -1);
    glm::vec3 splat_color;


    while (window.isOpen() && active) {
        sf::Event event;
        while (window.pollEvent(event)) {
            switch(event.type) {
            case sf::Event::Closed: {
                active = false;
            } break;
            case sf::Event::KeyPressed: {
                if (event.key.code == sf::Keyboard::Escape) {
                    active = false;
                } else if (event.key.code == sf::Keyboard::Space) {
                    state = ViewState((state + 1) % ViewState::COUNT);
                }
            } break;
            case sf::Event::MouseMoved: {
                if (mouse_down) {
                    glm::ivec2 screen_pos = glm::ivec2 { event.mouseMove.x, window_height - event.mouseMove.y - 1 };
                    force_dir += glm::vec2(screen_pos) - glm::vec2(last_cursor_pos);

                    glm::vec2 rel_click_pos = (glm::vec2(screen_pos) + glm::vec2(0.5f)) / glm::vec2(window_width, window_height);
                    click_pos = glm::ivec2(rel_click_pos * glm::vec2(SIM_WIDTH, SIM_HEIGHT) - glm::vec2(0.5f));
                    color_click_pos = glm::ivec2(rel_click_pos * glm::vec2(COLOR_WIDTH, COLOR_HEIGHT) - glm::vec2(0.5f));

                    last_cursor_pos = screen_pos;
                }
                
            } break;
            case sf::Event::MouseButtonPressed: {
                if (event.mouseButton.button == sf::Mouse::Left) {
                    splat_color = generateRandomColor();
                    mouse_down = true;

                    glm::ivec2 screen_pos = glm::ivec2 { event.mouseButton.x, window_height - event.mouseButton.y - 1 };
                    last_cursor_pos = screen_pos;

                    glm::vec2 rel_click_pos = (glm::vec2(screen_pos) + glm::vec2(0.5f)) / glm::vec2(window_width, window_height);
                    click_pos = glm::ivec2(rel_click_pos * glm::vec2(SIM_WIDTH, SIM_HEIGHT) - glm::vec2(0.5f));
                    color_click_pos = glm::ivec2(rel_click_pos * glm::vec2(COLOR_WIDTH, COLOR_HEIGHT) - glm::vec2(0.5f));
                }
            } break;
            case sf::Event::MouseButtonReleased: {
                if (event.mouseButton.button == sf::Mouse::Left) {
                    mouse_down = false;
                }

                break;
            }
            case sf::Event::Resized: {
                window_width = event.size.width;
                window_height = event.size.height;

                glViewport(0, 0, event.size.width, event.size.height);
                dx = 100.0f / glm::vec2(window_width - 1, window_height -1);

                break;
            }
            }
        }

        if (mouse_down) {
            useComputeShader(COLOR_WIDTH, COLOR_HEIGHT, dx, splat_color, force_dir, set_color_shader, color, velocity, pressure, divergence.getID(), color_click_pos);
            color.swap();
        }

        useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, advect_boundary_shader, color, velocity, pressure, divergence.getID());
        velocity.swap();
        
        useComputeShader(COLOR_WIDTH, COLOR_HEIGHT, dx, splat_color, force_dir, advect_color_shader, color, velocity, pressure, divergence.getID(), color_click_pos);
        color.swap();

        useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, advect_shader, color, velocity, pressure, divergence.getID());
        velocity.swap();
        pressure.swap();

        for (int i = 0; i < 30; ++i) {
            useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, diffuse_shader, color, velocity, pressure, divergence.getID());
            velocity.swap();
        }

        if (mouse_down) {
            useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, apply_force_shader, color, velocity, pressure, divergence.getID(), click_pos);
            velocity.swap();

            force_dir = glm::vec2(0.0f);
        }
        
        useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, divergence_calc_shader, color, velocity, pressure, divergence.getID());
        
        useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, pressure_boundary_shader, color, velocity, pressure, divergence.getID());
        pressure.swap();

        for (int i = 0; i < 70; ++i) {
            useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, pressure_solve_shader, color, velocity, pressure, divergence.getID());
            pressure.swap();
        }

        useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, advect_boundary_shader, color, velocity, pressure, divergence.getID());
        velocity.swap();

        useComputeShader(SIM_WIDTH, SIM_HEIGHT, dx, splat_color, force_dir, gradient_sub_shader, color, velocity, pressure, divergence.getID());
        velocity.swap();


        glCheckError(glClear(GL_COLOR_BUFFER_BIT));

        // glCheckError(glBindVertexArray(quad.getVAO()));
        // color_shader.use();

        // glCheckError(glActiveTexture(GL_TEXTURE0));
        // glCheckError(glBindTexture(GL_TEXTURE_2D, color.src().getID()));
        // color_shader.setInt("tex", 0);

        switch (state) {
            case ViewState::COLOR:
                displayTexture(quad, color_shader, color.src());
                break;
            case ViewState::VELOCITY:
                displayTexture(quad, velocity_shader, velocity.src());
                break;
            default:
                window.close();
                return 1;
        }

        glCheckError(glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0));

        glCheckError(glBindVertexArray(0));

        window.display();

        std::this_thread::sleep_for(std::chrono::milliseconds(int(1000.0f / 144.0f)));
    }

    window.close();

    return 0;
}