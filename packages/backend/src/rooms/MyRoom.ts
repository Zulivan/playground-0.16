import { IncomingMessage } from "http";
import { Room, Client } from "@colyseus/core";
import { Schema, MapSchema, type, ArraySchema, view, StateView } from "@colyseus/schema";
import { JWT } from "@colyseus/auth";

export class Player extends Schema {
  @type("string") name: string;
  @type("number") score: number = 0;
  @type("boolean") speaking: boolean = false;
}

export class PizzaIngredient extends Schema {
  @type("string") name: string = "Ingredient";
  @type("number") price: number = 20;
  @type("boolean") isVegetarian: boolean = true;
}

export class Pizza extends Schema { // We use pizza as an example
  @type("string") name: string;
  @type("number") price: number;
  @type([PizzaIngredient]) ingredients = new ArraySchema<PizzaIngredient>();
  @type(["string"]) tags = new ArraySchema<string>();
}

export class ViewsHolder extends Schema {
  @type("boolean") hasBeenSet: boolean = false
  @view() @type([Pizza]) perPlayerPizza = new ArraySchema<Pizza>();
}

export class MyRoomState extends Schema {
  @type("number") highestScore: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(ViewsHolder) viewsHolder = new ViewsHolder();
}

export class MyRoom extends Room<MyRoomState> {

  static async onAuth(token: string, req: IncomingMessage) {
    console.log("COOKIE:", req.headers.cookie);
    return (token) ? await JWT.verify(token) : { guest: true };
  }

  onCreate (options: any) {
    this.setState(new MyRoomState());

    this.onMessage("distributeViews", async (cli, pl) => {


      // Messages work fine here
      cli.send("serverMsg", { yes: true });
      this.broadcast("serverMsg", "yellow");


      console.log("We're going to give a randomly generated pizza to all players as well as a shared pizza")

      const viewsHolder = new ViewsHolder();
      viewsHolder.hasBeenSet = true;

      this.state.viewsHolder = viewsHolder;

      const sharedPizza = new Pizza();
      sharedPizza.name = "Shared Pizza";
      sharedPizza.ingredients.push(new PizzaIngredient());
      sharedPizza.price = 100;

      // RECOMMENDED USE: Put foreach instead of a for loop
      // this.clients.forEach(async (client) => {
      // looks like using foreach prevents the "unknown refId" error
      this.clients.forEach(async (client) => {
        client.view?.add(sharedPizza);

        const pizza = new Pizza();
        pizza.name = "Pizza " + Math.floor(Math.random() * 100);
        pizza.price = Math.floor(Math.random() * 100);
        pizza.tags.push("tag1", "tag2", "tag3");
        
        for (let i = 0; i < 3; i++) {
          const ingredient = new PizzaIngredient();
          ingredient.name = "Ingredient " + i;
          ingredient.price = Math.floor(Math.random() * 100);
          ingredient.isVegetarian = (Math.random() > 0.5);
          pizza.ingredients.push(ingredient);
        }

        console.log('\x1b[33mEven though ingredients are not marked as @view, they will be sent to the client as well:\x1b[0m', pizza.ingredients);


        client.view?.add(pizza);
        viewsHolder.perPlayerPizza.push(pizza);

        const sleep = (ms: number) => new Promise(resolve => this.clock.setTimeout(resolve, ms));
        
        // Uncommenting this sleep will crash the server
        // await sleep(30);

        console.log('\x1b[33mLets manually add the ingredients to view\x1b[0m');
        client.view?.add(pizza.ingredients);
        await sleep(1000);

        console.log('\x1b[33mLets update the ingredients from view\x1b[0m');
            
        // successful update of the ingredients
        pizza.ingredients.forEach((ingredient) => {
          ingredient.name = "Updated ingredient name";
          ingredient.price = 333;
        });

        await sleep(1000);
        
        console.log('\x1b[33mLets remove the ingredients from view\x1b[0m');

        // Adding shared pizza after a long delay
        client.view?.add(sharedPizza);

        // Uncommenting this will crash the server
        // Error: Cannot read properties of undefined (reading '-2')
        // client.view?.remove(pizza.ingredients);

        // Still doesn't work
        // client.view?.remove(pizza);
      });
      
      // Ingredients of shared pizza are not sent to the client
      this.state.viewsHolder.perPlayerPizza.push(sharedPizza);

    });

    this.onMessage("increment", (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      player.score++;

      // update highest score of this session
      if (this.state.highestScore < player.score) {
        this.state.highestScore = player.score;
      }
    });

    this.onMessage("speaking", (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      player.speaking = (payload === true);
    });

  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    const player = new Player();

    client.view = client.view || new StateView();

    if (client.auth.guest) {
      player.name = "Guest";

    } else if (!client.auth.anonymous) {
      player.name = client.auth.name;

    } else {
      player.name = "Anonymous";
    }

    this.state.players.set(client.sessionId, player);
  }

  async onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    const player = this.state.players.get(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
