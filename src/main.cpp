#include <SFML/Graphics.hpp>
#include <GL/glew.h>
#include <glm/glm.hpp>
#include <iostream>
#include <thread>

#include "gl_check.h"
#include "quad.h"
#include "graphic_shader.h"
#include "compute_shader.h"
#include "texture.h"

#define SCREEN_WIDTH 1280
#define SCREEN_HEIGHT 720

#define SIM_WIDTH 1280
#define SIM_HEIGHT 720


std::unique_ptr<unsigned char[]> generateTextureData(int width, int height) {
    auto data = std::make_unique<float[]>(width * height);

    float max_distance = glm::length(glm::vec2(width * 0.5f, height * 0.5f));

    for (int j = 0; j < height; ++j) {
        for (int i = 0; i < width; ++i) {
            float h1 = float(i) / float(width - 1);
            float h2 = float(j) / float(height - 1);

            float h = 0.5f * (h1 + h2);

            float distance = glm::distance(glm::vec2(width * 0.5f, height * 0.5f), glm::vec2(i, j)) / max_distance;

            data[j * width + i] = std::pow(1.0f - distance, 2.0f);
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

void useComputeShader(ComputeShader& shader, unsigned color_id, unsigned velocity_id, unsigned pressure_id, unsigned divergence_id) {
    shader.use();
    shader.setFloat("timestep", 0.033f);
    shader.setFloat("dx", 1.0f);
    shader.setFloat("viscosity", 0.01f);
    shader.setBool("has_clicked", false);

    glCheckError(glBindImageTexture(0, color_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));
    glCheckError(glBindImageTexture(1, velocity_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_RG32F));
    glCheckError(glBindImageTexture(2, pressure_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));
    glCheckError(glBindImageTexture(3, divergence_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));

    glCheckError(glActiveTexture(GL_TEXTURE0));
    glCheckError(glBindTexture(GL_TEXTURE_2D, color_id));
    shader.setInt("color_sampler", 0);
    glCheckError(glActiveTexture(GL_TEXTURE1));
    glCheckError(glBindTexture(GL_TEXTURE_2D, velocity_id));
    shader.setInt("velocity_sampler", 1);
    glCheckError(glActiveTexture(GL_TEXTURE2));
    glCheckError(glBindTexture(GL_TEXTURE_2D, pressure_id));
    shader.setInt("pressure_sampler", 2);
    glCheckError(glActiveTexture(GL_TEXTURE3));
    glCheckError(glBindTexture(GL_TEXTURE_2D, divergence_id));
    shader.setInt("divergence_sampler", 3);

    glCheckError(glDispatchCompute(SCREEN_WIDTH / 16, SCREEN_HEIGHT / 16, 1));
    glCheckError(glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT));

    glCheckError(glUseProgram(0));
}

void useComputeShader(ComputeShader& shader, unsigned color_id, unsigned velocity_id, unsigned pressure_id, unsigned divergence_id, const glm::ivec2 &clic) {
    shader.use();
    shader.setFloat("timestep", 0.033f);
    shader.setFloat("dx", 1.0f);
    shader.setFloat("viscosity", 0.1f);
    shader.setBool("has_clicked", true);
    shader.setVec2i("click_pos", clic);

    glCheckError(glBindImageTexture(0, color_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));
    glCheckError(glBindImageTexture(1, velocity_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_RG32F));
    glCheckError(glBindImageTexture(2, pressure_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));
    glCheckError(glBindImageTexture(3, divergence_id, 0, GL_FALSE, 0, GL_WRITE_ONLY, GL_R32F));

    glCheckError(glActiveTexture(GL_TEXTURE0));
    glCheckError(glBindTexture(GL_TEXTURE_2D, color_id));
    shader.setInt("color_sampler", 0);
    glCheckError(glActiveTexture(GL_TEXTURE1));
    glCheckError(glBindTexture(GL_TEXTURE_2D, velocity_id));
    shader.setInt("velocity_sampler", 1);
    glCheckError(glActiveTexture(GL_TEXTURE2));
    glCheckError(glBindTexture(GL_TEXTURE_2D, pressure_id));
    shader.setInt("pressure_sampler", 2);
    glCheckError(glActiveTexture(GL_TEXTURE3));
    glCheckError(glBindTexture(GL_TEXTURE_2D, divergence_id));
    shader.setInt("divergence_sampler", 3);

    glCheckError(glDispatchCompute(SIM_WIDTH / 16, SIM_HEIGHT / 16, 1));
    glCheckError(glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT));

    glCheckError(glUseProgram(0));
}

int main() {
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
    GraphicShader gshader("shaders/vertex/simple.glsl", "shaders/fragment/simple.glsl");
    ComputeShader advect_boundary_shader("shaders/compute/advect_boundary.glsl");
    ComputeShader advect_shader("shaders/compute/advect.glsl");
    ComputeShader apply_force_shader("shaders/compute/apply_force.glsl");
    ComputeShader diffuse_shader("shaders/compute/diffuse.glsl");
    ComputeShader divergence_calc_shader("shaders/compute/divergence_calc.glsl");
    ComputeShader gradient_sub_shader("shaders/compute/gradient_sub.glsl");
    ComputeShader pressure_boundary_shader("shaders/compute/pressure_boundary.glsl");
    ComputeShader pressure_solve_shader("shaders/compute/pressure_solve.glsl");

    Texture color(SCREEN_WIDTH, SCREEN_HEIGHT, GL_R32F, GL_RED, GL_FLOAT, std::move(generateTextureData(SCREEN_WIDTH, SCREEN_HEIGHT)));
    Texture velocity(SCREEN_WIDTH, SCREEN_HEIGHT, GL_RG32F, GL_RG, GL_FLOAT, std::move(generateVelocityData(SCREEN_WIDTH, SCREEN_HEIGHT)));
    Texture pressure(SCREEN_WIDTH, SCREEN_HEIGHT, GL_R32F);
    Texture divergence(SCREEN_WIDTH, SCREEN_HEIGHT, GL_R32F);

    bool active = true;

    glm::ivec2 click_pos;

    int window_width = SCREEN_WIDTH;
    int window_height = SCREEN_HEIGHT;

    while (window.isOpen() && active) {
        bool has_clicked = false;
        
        sf::Event event;
        while (window.pollEvent(event)) {
            switch(event.type) {
            case sf::Event::Closed: {
                active = false;
            } break;
            case sf::Event::KeyPressed: {
                if (event.key.code == sf::Keyboard::Escape) {
                    active = false;
                }
            } break;
            case sf::Event::MouseButtonPressed: {
                if (event.mouseButton.button == sf::Mouse::Left) {
                    has_clicked = true;
                    glm::ivec2 screen_pos = glm::ivec2 { event.mouseButton.x, window_height - event.mouseButton.y - 1 };
                    glm::vec2 rel_click_pos = (glm::vec2(screen_pos) + glm::vec2(0.5f)) / glm::vec2(window_width, window_height);
                    click_pos = glm::ivec2(rel_click_pos * glm::vec2(SIM_WIDTH, SIM_HEIGHT) - glm::vec2(0.5f));
                }
                break;
            }
            case sf::Event::Resized: {
                window_width = event.size.width;
                window_height = event.size.height;
                glViewport(0, 0, event.size.width, event.size.height);
                break;
            }
            }
        }


        useComputeShader(advect_boundary_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());
        useComputeShader(advect_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());

        for (int i = 0; i < 30; ++i) {
            useComputeShader(diffuse_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());
        }

        if (has_clicked) {
            useComputeShader(apply_force_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID(), click_pos);
        }
        
        useComputeShader(divergence_calc_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());
        useComputeShader(pressure_boundary_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());

        for (int i = 0; i < 70; ++i) {
            useComputeShader(pressure_solve_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());
        }

        useComputeShader(advect_boundary_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());
        useComputeShader(gradient_sub_shader, color.getID(), velocity.getID(), pressure.getID(), divergence.getID());

        glCheckError(glClear(GL_COLOR_BUFFER_BIT));

        glCheckError(glBindVertexArray(quad.getVAO()));
        gshader.use();

        glCheckError(glActiveTexture(GL_TEXTURE0));
        glCheckError(glBindTexture(GL_TEXTURE_2D, color.getID()));
        gshader.setInt("tex", 0);
        

        glCheckError(glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0));

        glCheckError(glBindVertexArray(0));

        window.display();

        std::this_thread::sleep_for(std::chrono::milliseconds(33));
    }

    window.close();

    return 0;
}