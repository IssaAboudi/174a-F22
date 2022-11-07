import {defs, tiny} from './examples/common.js';

// Modified tiny-graphics-widgets.js common.js
// to clean up game webpage (disabled code block widget, file structure widget,
// and basic movement controls set by default - we will create our own movement controls
// called "Game_Controls")

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const Game_Controls = defs.Game_Controls =
    class Game_Controls extends Scene {

        constructor() {
            super();
            const data_members = {
                thrust: new Vector(0, 0), pos: new Vector(0, 0),
                radians_per_frame: 1 / 200, meters_per_frame: 10, speed_multiplier: 1
            };
            Object.assign(this, data_members);

            this.mouse_enabled_canvases = new Set();
            this.will_take_over_graphics_state = true;
        }

        set_recipient(matrix_closure, inverse_closure) {
            // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
            // instead, track an external target matrix to modify.  Targets must be pointer references
            // made using closures.
            this.matrix = matrix_closure;
            this.inverse = inverse_closure;
        }

        reset(graphics_state) {
            // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
            // encountered program_state object.  Targets must be pointer references made using closures.
            this.set_recipient(() => graphics_state.camera_transform,
                () => graphics_state.camera_inverse);
        }

        make_control_panel() {
            //Make all the buttons for in the control panel here:

            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
            this.key_triggered_button("Sample Button", ["A"], () => this.attached = () => null);
            this.new_line();

        }

        display(context, graphics_state, dt = graphics_state.animation_delta_time / 1000) {
            // The whole process of acting upon controls begins here.
            const m = this.speed_multiplier * this.meters_per_frame,
                r = this.speed_multiplier * this.radians_per_frame;

            if (this.will_take_over_graphics_state) {
                this.reset(graphics_state);
                this.will_take_over_graphics_state = false;
            }

        }
    }

export class BrickBreaker extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

	this.shapes = {
		sphere: new defs.Subdivision_Sphere(4),
		circle: new defs.Regular_2D_Polygon(1, 15)
	}
	
	this.materials = {
		default: new Material(new defs.Phong_Shader(),
            {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")})
    }

    }

    make_control_panel() {
        this.control_panel.innerHTML += " Description of Game goes here.<br>";
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Game_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        const ts = program_state.animation_time / 1000; //time step (for each second of animation)
        const dt = program_state.animation_delta_time / 1000; //time difference between current and last frame (keep game frame independent)

    	//add code here
        let ball_transform = Mat4.identity();

        this.shapes.circle.draw(context, program_state, ball_transform, this.materials.default);
    }


}





class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}
