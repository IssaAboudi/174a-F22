import { defs, Subdivision_Sphere, tiny } from "./examples/common.js";
// import { Keyboard_Manager } from "./tiny-graphics.js";

// Modified tiny-graphics-widgets.js common.js
// to clean up game webpage (disabled code block widget, file structure widget,
// and basic movement controls set by default - we will create our own movement controls
// called "Game_Controls")

const {
  Vector,
  Vector3,
  vec,
  vec3,
  vec4,
  color,
  hex_color,
  Shader,
  Matrix,
  Mat4,
  Light,
  Shape,
  Material,
  Scene,
} = tiny;

//Color corresponds to health level
// - created here for convenience
const blue = "1303fc"; // Health 5
const green = "00c91b"; // Health 4
const yellow = "fff308"; // Health 3
const orange = "ffa500"; // Health 2
const red = "ff0000"; // Health 1
const grey = "808080"; //paddle unbreakable
const purple = "bf40bf";
const violet = "CF9FFF";
const darkpurple = "301934";

// Variable to say ball is till, and second variable to say ball
// is currently moving
let launch = false;
let ball_angle = Math.PI / 2;
let moving = false;
// let ball_time = 0;
let speed_factor = 0.3;
let lives = 3;

//Game Design Settings
// - these are for making the game feel good
let paddle_move = 0;
const howMuchMove = 4; //how many units the paddle moves left and right each press
const max_range = 27; //maximum range of motion left or right from the center

function getHealthColor(health) {
  //return color corresponding to health value of brick
  switch (health) {
    case 5:
      // console.log("blue");
      return hex_color(blue);
    case 4:
      // console.log("green");
      return hex_color(green);
    case 3:
      // console.log("yellow");
      return hex_color(yellow);
    case 2:
      // console.log("orange");
      return hex_color(orange);
    case 1:
      // console.log("red");
      return hex_color(red);
    default:
    // console.log("Error: Invalid health");
  }
}

class Cube extends Shape {
  constructor() {
    super("position", "normal");

    // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
    this.arrays.position = Vector3.cast(
      [-1, -1, -1],
      [1, -1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, -1],
      [-1, 1, -1],
      [1, 1, 1],
      [-1, 1, 1],
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, -1],
      [-1, 1, 1],
      [1, -1, 1],
      [1, -1, -1],
      [1, 1, 1],
      [1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [-1, 1, 1],
      [1, 1, 1],
      [1, -1, -1],
      [-1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1]
    );
    this.arrays.normal = Vector3.cast(
      [0, -1, 0],
      [0, -1, 0],
      [0, -1, 0],
      [0, -1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [-1, 0, 0],
      [-1, 0, 0],
      [-1, 0, 0],
      [-1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, -1],
      [0, 0, -1],
      [0, 0, -1],
      [0, 0, -1]
    );
    // Arrange the vertices into a square shape in texture space too:
    this.indices.push(
      0,
      1,
      2,
      1,
      3,
      2,
      4,
      5,
      6,
      5,
      7,
      6,
      8,
      9,
      10,
      9,
      11,
      10,
      12,
      13,
      14,
      13,
      15,
      14,
      16,
      17,
      18,
      17,
      19,
      18,
      20,
      21,
      22,
      21,
      23,
      22
    );
  }
}

class Brick extends Cube {
  constructor(health = 5, color = hex_color(blue)) {
    super("position", "normal");
    //health of brick is initialized to 5
    // - when health reaches 0, we destroy the brick
    this.health = health;
    //color is initialized to white
    // - color of brick will correspond with health
    this.color = color;

    //add transform component:
    this.brick_transform = Mat4.identity();
    this.brick_transform = this.brick_transform
      .times(Mat4.scale(3, 1, 1))
      .times(Mat4.translation(3, 0, 0));
    //half height to get distance from center to top and bottom
    this.hheight = 1;
    //half width to get distance from center to left and right
    this.hwidth = 3;
  }
  getTransform() {
    return this.brick_transform;
  }
  // get center of brick (cannot set in constructor as it changes)
  getCenter() {
    return this.brick_transform.times(vec4(0, 0, 0, 1));
  }

  // returns true if brick died
  checkCollision(ball) {
    let brick_center = this.getCenter();
    let ball_center = ball.getCenter();
    let x_diff = Math.abs(ball_center[0] - brick_center[0]);
    let y_diff = Math.abs(ball_center[1] - brick_center[1]);
    let collision = false;

    // collision from below:
    // center of sphere is within R + height of square/2
    if (
      x_diff <= this.hwidth && //within left and right of brick
      y_diff <= ball.radius + this.hheight //above top or bottom border of brick
      // ball_center[1] < brick_center[1] //the ball is below the brick not necessary
    ) {
      ball_angle = 2 * Math.PI - ball_angle;
      collision = true;
    } else if (
      y_diff <= this.hheight && //within left and right of brick
      x_diff <= ball.radius + this.hwidth //above top or bottom border of brick
      // ball_center[1] < brick_center[1] //the ball is below the brick not necessary
    ) {
      ball_angle = Math.PI - ball_angle;
      collision = true;
    }

    // decrement health if not a paddle and collision takes place
    if (collision == true) {
      this.health = this.health - 1;
      if (this.health == 0) {
        return true;
      }
    }

    return false;
  }
}

class Paddle extends Cube {
  constructor(color = hex_color(grey)) {
    super("position", "normal");
    this.color = color;
    this.paddle_start_Xpos = 1 * 6.2 + 4 * 6.4; //aka 30.6 (constant operation)
    this.paddle_transform = Mat4.identity();
    this.paddle_transform = this.paddle_transform
      .times(Mat4.translation(this.paddle_start_Xpos, 3, 14)) //
      .times(Mat4.translation(paddle_move, 0, 0)) //handles movement with a and d keys (movement amount per press is found at "howMuchMove")
      .times(Mat4.scale(6.2, 1, 1));
    //half height to get distance from center to top and bottom
    this.hheight = 1;
    //half width to get distance from center to left and right
    this.hwidth = 6.2;
  }

  getTransform() {
    return this.paddle_transform;
  }
  // get center of brick (cannot set in constructor as it changes)
  getCenter() {
    return this.paddle_transform.times(vec4(0, 0, 0, 1));
  }

  // returns true if brick died
  checkCollision(ball) {
    let paddle_center = this.getCenter();
    let ball_center = ball.getCenter();
    let x_diff = Math.abs(ball_center[0] - paddle_center[0]);
    let y_diff = Math.abs(ball_center[1] - paddle_center[1]);
    let collision = false;

    // collision from below:
    // center of sphere is within R + height of square/2
    if (
      x_diff <= this.hwidth && //within left and right of brick
      y_diff <= ball.radius + this.hheight //above top or bottom border of brick
      // ball_center[1] < brick_center[1] //the ball is below the brick not necessary
    ) {
      // ball_angle = 2 * Math.PI - ball_angle;
      ball_angle =
        Math.PI / 2 +
        Math.atan((ball_center[0] - paddle_center[0]) / this.hheight);
    } else if (
      y_diff <= this.hheight && //within left and right of brick
      x_diff <= ball.radius + this.hwidth //above top or bottom border of brick
      // ball_center[1] < brick_center[1] //the ball is below the brick not necessary
    ) {
      ball_angle = Math.PI - ball_angle;
    }
  }
}

class Wall extends Cube {
  constructor(color = hex_color(darkpurple)) {
    super("position", "normal");
    this.color = color;
    this.wall_transform = Mat4.translation(-42, 20, 0).times(
      Mat4.scale(40, 20, 200).times(Mat4.identity())
    );
    // this.wall_transform = this.wall_transform
    //   .times(Mat4.scale(3, 2, 1))
    //   .times(Mat4.translation(0.4, -7, 0));
    // this.space_margin = 2.2;
    // this.wall_transform = this.wall_transform.times(
    //   Mat4.translation(-2.6, 17, 14)
    // );

    //half height to get distance from center to top and bottom
    this.hheight = 20;
    //half width to get distance from center to left and right
    this.hwidth = 40;
  }
  getTransform() {
    return this.wall_transform;
  }
  // get center of brick (cannot set in constructor as it changes)
  getCenter() {
    return this.wall_transform.times(vec4(0, 0, 0, 1));
  }

  checkCollision(ball) {
    let wall_center = this.getCenter();
    let ball_center = ball.getCenter();
    let x_diff = Math.abs(ball_center[0] - wall_center[0]);
    let y_diff = Math.abs(ball_center[1] - wall_center[1]);

    // collision from below:
    // center of sphere is within R + height of square/2
    if (
      x_diff <= this.hwidth && //within left and right of brick
      y_diff <= ball.radius + this.hheight //above top or bottom border of brick
      // ball_center[1] < brick_center[1] //the ball is below the brick not necessary
    ) {
      ball_angle = 2 * Math.PI - ball_angle;
    } else if (
      y_diff <= this.hheight && //within left and right of brick
      x_diff <= ball.radius + this.hwidth //above top or bottom border of brick
      // ball_center[1] < brick_center[1] //the ball is below the brick not necessary
    ) {
      ball_angle = Math.PI - ball_angle;
    }
  }
}

class Ball extends Subdivision_Sphere {
  constructor() {
    super(4);

    this.ball_velocity = new Vector(0, 0);

    this.radius = 1;

    //add transform component
    this.ball_transform = Mat4.identity();
    //Initially placing ball on pad
    this.ball_transform = this.ball_transform.times(
      Mat4.translation(1 * 6.2 + 4 * 6.4, 1 + 4 + 0.1, 14)
    );

    // this.ball_position = new Vector3(
    //   this.ball_transform[0][3],
    //   this.ball_transform[1][3],
    //   this.ball_transform[2][3]
    // );
  }
  getCenter() {
    return this.ball_transform.times(vec4(0, 0, 0, 1));
  }
}

// // Example B: Define lines
class Axis extends Shape {
  constructor() {
    super("position", "color");
    this.arrays.position = Vector3.cast(
      [0, 0, 0],
      [1000, 0, 0],
      [0, 0, 0],
      [0, 1000, 0],
      [0, 0, 0],
      [0, 0, 1000]
    );
    this.arrays.color = [
      vec4(1, 0, 0, 1),
      vec4(1, 0, 0, 1),
      vec4(0, 1, 0, 1),
      vec4(0, 1, 0, 1),
      vec4(0, 0, 1, 1),
      vec4(0, 0, 1, 1),
    ];
    this.indices = false; // not necessary
  }
}

const Game_Controls = (defs.Game_Controls = class Game_Controls extends Scene {
  constructor() {
    super();
    const data_members = {
      thrust: new Vector(0, 0), //we only need movement in X axis for the paddle
      pos: vec3(0, 0, 0),
      z_axis: vec3(0, 0, 0),
      radians_per_frame: 1 / 200,
      meters_per_frame: 10,
      speed_multiplier: 1,
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
    this.set_recipient(
      () => graphics_state.camera_transform,
      () => graphics_state.camera_inverse
    );
  }

  make_control_panel() {
    //Make all the buttons for in the control panel here:
    this.key_triggered_button("Launch Ball", ["s"], () => {
      if (lives > 0) {
        launch = true;
      } else {
        launch = false;
      }
    });
    //Handle Left and Right Inputs
    this.key_triggered_button(
      "Move Paddle Left",
      ["a"],
      () => {
        if (paddle_move >= -max_range) {
          //constrains movement on left side
          paddle_move += -howMuchMove;
          // console.log("a pressed");
        }
      },
      undefined,
      () => {
        paddle_move += 0;
      }
    );
    this.key_triggered_button(
      "Move Paddle Right",
      ["d"],
      () => {
        if (paddle_move <= max_range) {
          //constrains movement on right side
          paddle_move += +howMuchMove;
          // console.log("d pressed");
        }
      },
      undefined,
      () => {
        paddle_move += 0;
      }
    );

    this.new_line();
  }

  display(
    context,
    graphics_state,
    dt = graphics_state.animation_delta_time / 1000
  ) {
    // The whole process of acting upon controls begins here.
    const m = this.speed_multiplier * this.meters_per_frame,
      r = this.speed_multiplier * this.radians_per_frame;

    if (this.will_take_over_graphics_state) {
      this.reset(graphics_state);
      this.will_take_over_graphics_state = false;
    }
  }
});

export class BrickBreaker extends Scene {
  constructor() {
    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    super();

    this.shapes = {
      sphere: new defs.Subdivision_Sphere(4),
      circle: new defs.Regular_2D_Polygon(1, 15),
      bricks: new Brick(),
      paddle: new Paddle(),
      axis: new Axis(),
      ball: new Ball(),
      lWall: new Wall(),
      rWall: new Wall(),
      tWall: new Wall(),
      bWall: new Wall(),
    };

    this.materials = {
      default: new Material(new defs.Phong_Shader(), {
        ambient: 0.7,
        diffusivity: 0.6,
        color: hex_color("#ffffff"),
      }),
      plastic: new Material(new defs.Phong_Shader(), {
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        color: hex_color("#b08040"),
      }),
    };

    this.white = new Material(new defs.Basic_Shader());

    let eye_position = vec3(31, 20, 70); //Initialize Camera to
    let eye_look_at = vec3(31, 20, 0); //Set camera to look at the middle of the game window

    this.initial_camera_location = Mat4.look_at(
      eye_position,
      eye_look_at,
      vec3(0, 1, 0)
    );

    this.grid = [];
    // Initialize the grid at the beginning of the game
    // - can choose whether we want to have a random level or predefined levels
    // this.create_random_level();

    //How to form custom level:
    this.level = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    ];
    this.create_custom_level(this.level);
    // this.paddle = new Brick(1, hex_color("ffffff"));
    // this.shapes.paddle.setPaddle();

    //fix wall transforms
    this.shapes.rWall.wall_transform = Mat4.translation(147, 0, 0).times(
      this.shapes.rWall.wall_transform
    );

    this.shapes.tWall.wall_transform = Mat4.translation(73.5, 38, 0).times(
      this.shapes.tWall.wall_transform
    );
    this.shapes.bWall.wall_transform = Mat4.translation(73.5, 0, -187).times(
      this.shapes.bWall.wall_transform
    );
  }

  create_random_level() {
    //level is created completely randomly
    const space_margin = 2.2; //amount of spacing between each brick

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        let health = Math.random() * 5;
        health = health | 1; //eliminate decimals - make health an integer
        let color = getHealthColor(health);

        let tempBrick = new Brick(health, color);
        tempBrick.brick_transform = tempBrick.brick_transform
          .times(Mat4.translation(-2.6, 17, 14)) //hardcoded positions for the grid
          .times(Mat4.translation(space_margin * j, space_margin * i, 0));
        this.grid.push(tempBrick);
      }
    }
  }

  create_custom_level(level) {
    //Supply a 2D array for the custom level layout
    const space_margin = 2.2; //amount of spacing between each brick
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        let health = level[i][j];
        // health = health | 1; //eliminate decimals - make health an integer
        let color = getHealthColor(health);

        let tempBrick = new Brick(health, color);
        tempBrick.brick_transform = tempBrick.brick_transform
          .times(Mat4.translation(-2.6, 17, 14)) //hardcoded positions for the grid
          .times(Mat4.translation(space_margin * j, space_margin * i, 0));
        // tempBrick.brick_transform = Mat4.translation(0, 0, -100).times(
        //   tempBrick.brick_transform
        // );
        this.grid.push(tempBrick);
      }
    }
  }

  make_control_panel() {
    this.control_panel.innerHTML +=
      ' <h2> Bruin Brick Breaker is a recreation of an old atari game known as "Breakout". </h2>';
    this.control_panel.innerHTML +=
      " <h2>The objective of the game is simple! Simply use the paddles to bounce the ball " +
      "and destroy all the bricks in the level. </h2> <br>";
    this.control_panel.innerHTML +=
      " <h2> If the ball falls below where the paddle is, you lose a life. </h2> <br>";
    this.control_panel.innerHTML +=
      " <br> <h2> You only have 3 lives! Good luck! </h2> <br>";
  }

  display(context, program_state) {
    // display():  Called once per frame of animation.
    // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
    if (!context.scratchpad.controls) {
      this.children.push(
        (context.scratchpad.controls = new defs.Game_Controls())
      );
      // this.children.push((context.scratchpad.controls = new defs.Movement_Controls())); //Don't need this because camera is fixed

      // Define the global camera and projection matrices, which are stored in program_state.
      program_state.set_camera(this.initial_camera_location);
    }

    program_state.projection_transform = Mat4.perspective(
      Math.PI / 4,
      context.width / context.height,
      0.1,
      1000
    );

    const ts = program_state.animation_time / 1000; //time step (for each second of animation)
    const dt = program_state.animation_delta_time / 1000; //time difference between current and last frame (keep game frame independent)

    program_state.lights = [
      new Light(vec4(0, 0, 20, 1), color(1, 1, 1, 1), 10 ** 10),
    ]; //Default Lighting for project

    if (lives == 0) {
      this.grid = [];
      this.create_custom_level(this.level);
    }
    // Draw Cube Grid 10 x 10 (use function to set size this is temp)
    for (let i = 0; i < this.grid.length; i++) {
      this.shapes.bricks.draw(
        context,
        program_state,
        this.grid[i].brick_transform,
        this.materials.plastic.override({ color: this.grid[i].color })
      );
    }

    // Draw paddle (centered it, but use variables to keep it always centered depending on grid pramaeters)
    // (use a deformed sphere so that the ball goes off at different angles)
    // ~ Changes 11/10/2022 by Issa: Changed name from plate_transform to paddle_transform (more descriptive)
    // ~ Changes 11/30/2022 by Issa: Changed name from paddle_start_pos to paddle_start_Xpos (more specific)
    //                             - Started paddle Z at 14 to match bricks and ball pos
    //                             - Changed dimensions of paddle to be thinner on y and moved it up on y

    // Update location of Paddle
    this.shapes.paddle.paddle_transform = Mat4.identity()
      .times(Mat4.translation(this.shapes.paddle.paddle_start_Xpos, 3, 14)) //
      .times(Mat4.translation(paddle_move, 0, 0)) //handles movement with a and d keys (movement amount per press is found at "howMuchMove")
      .times(Mat4.scale(6.2, 1, 1));

    this.shapes.paddle.draw(
      context,
      program_state,
      this.shapes.paddle.paddle_transform,
      this.materials.plastic.override({ color: this.shapes.paddle.color })
    );

    //Draw walls
    // left wall
    this.shapes.lWall.draw(
      context,
      program_state,
      this.shapes.lWall.wall_transform,
      this.materials.plastic.override({ color: this.shapes.lWall.color })
    );
    //right wall
    this.shapes.rWall.draw(
      context,
      program_state,
      this.shapes.rWall.wall_transform,
      this.materials.plastic.override({ color: this.shapes.rWall.color })
    );
    //top wall
    this.shapes.tWall.draw(
      context,
      program_state,
      this.shapes.tWall.wall_transform,
      this.materials.plastic.override({ color: this.shapes.tWall.color })
    );

    //back wall
    this.shapes.bWall.draw(
      context,
      program_state,
      this.shapes.bWall.wall_transform,
      this.materials.plastic.override({ color: this.shapes.bWall.color })
    );

    // initial game situation
    if (launch == false && moving == false) {
      // this.shapes.ball = new Ball();
      this.shapes.ball.draw(
        context,
        program_state,
        this.shapes.ball.ball_transform,
        this.materials.default
      );
    }
    // // if user clicked launch while ball was moving go back to same spot
    // else if (launch == false && moving == true) {
    //   this.shapes.ball = new Ball();
    //   moving = false;
    // }
    // *START* moving the ball (launch is true here)
    else if (launch == true && moving == false) {
      moving = true;
      // launch at random angle between pi/4 and 3pi/4
      ball_angle = Math.PI / 4 + Math.random() * (Math.PI / 2);
    } else {
      // move ball at ball angle
      // on collision update velocity vector and translation matrix
      // console.log(this.shapes.ball.getCenter());
      // Check for collision here with every box
      for (let i = 0; i < this.grid.length; i++) {
        let remove_brick = this.grid[i].checkCollision(this.shapes.ball);
        if (remove_brick) {
          this.grid.splice(i, 1);
          i--;
        }
      }
      this.shapes.paddle.checkCollision(this.shapes.ball);
      this.shapes.lWall.checkCollision(this.shapes.ball);
      this.shapes.rWall.checkCollision(this.shapes.ball);
      this.shapes.tWall.checkCollision(this.shapes.ball);

      this.shapes.ball.ball_transform = Mat4.translation(
        -Math.cos(ball_angle) * speed_factor,
        Math.sin(ball_angle) * speed_factor,
        0
      ).times(this.shapes.ball.ball_transform);

      this.shapes.ball.draw(
        context,
        program_state,
        this.shapes.ball.ball_transform,
        this.materials.default
      );
    }

    //check if ball is out of bounds and lost
    let ball_center = this.shapes.ball.getCenter();
    let paddle_center = this.shapes.paddle.getCenter();
    if (ball_center[1] + 10 < paddle_center[1]) {
      launch = false;
      moving = false;
      this.shapes.ball = new Ball();
      lives = lives - 1;
      paddle_move = 0;
    }
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
    const O = vec4(0, 0, 0, 1),
      camera_center = gpu_state.camera_transform.times(O).to3();
    gl.uniform3fv(gpu.camera_center, camera_center);
    // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
    const squared_scale = model_transform
      .reduce((acc, r) => {
        return acc.plus(vec4(...r).times_pairwise(r));
      }, vec4(0, 0, 0, 0))
      .to3();
    gl.uniform3fv(gpu.squared_scale, squared_scale);
    // Send the current matrices to the shader.  Go ahead and pre-compute
    // the products we'll need of the of the three special matrices and just
    // cache and send those.  They will be the same throughout this draw
    // call, and thus across each instance of the vertex shader.
    // Transpose them since the GPU expects matrices as column-major arrays.
    const PCM = gpu_state.projection_transform
      .times(gpu_state.camera_inverse)
      .times(model_transform);
    gl.uniformMatrix4fv(
      gpu.model_transform,
      false,
      Matrix.flatten_2D_to_1D(model_transform.transposed())
    );
    gl.uniformMatrix4fv(
      gpu.projection_camera_model_transform,
      false,
      Matrix.flatten_2D_to_1D(PCM.transposed())
    );

    // Omitting lights will show only the material color, scaled by the ambient term:
    if (!gpu_state.lights.length) return;

    const light_positions_flattened = [],
      light_colors_flattened = [];
    for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
      light_positions_flattened.push(
        gpu_state.lights[Math.floor(i / 4)].position[i % 4]
      );
      light_colors_flattened.push(
        gpu_state.lights[Math.floor(i / 4)].color[i % 4]
      );
    }
    gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
    gl.uniform4fv(gpu.light_colors, light_colors_flattened);
    gl.uniform1fv(
      gpu.light_attenuation_factors,
      gpu_state.lights.map((l) => l.attenuation)
    );
  }

  update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
    // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
    // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
    // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
    // program (which we call the "Program_State").  Send both a material and a program state to the shaders
    // within this function, one data field at a time, to fully initialize the shader for a draw.

    // Fill in any missing fields in the Material object with custom defaults for this shader:
    const defaults = {
      color: color(0, 0, 0, 1),
      ambient: 0,
      diffusivity: 1,
      specularity: 1,
      smoothness: 40,
    };
    material = Object.assign({}, defaults, material);

    this.send_material(context, gpu_addresses, material);
    this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
  }
}
