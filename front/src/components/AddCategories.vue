<template>
  <div>
    <v-row
      align="center"
      justify="center"
      v-if="$store.state.game.user_id === 0"
    >
      <v-col cols="12" sm="10" lg="6">
        <v-card>
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Add categories</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveCategories">
              <v-combobox
                deletable-chips
                label="Categories"
                multiple
                chips
                small-chips
                v-model="cats"
              ></v-combobox>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :loading="$store.state.socket.loading"
              color="primary"
              @click="saveCategories"
              >Save and start</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <WaitingScreen
      class="ma-4"
      text="Waiting for the game to start"
      v-else
    ></WaitingScreen>
  </div>
</template>

<script>
import WaitingScreen from "@/components/WaitingScreen.vue";

export default {
  components: { WaitingScreen },
  name: "AddCategories",
  data() {
    return { cats: [] };
  },
  methods: {
    saveCategories() {
      this.cats.forEach(element => {
        let obj = {
          action: "register_cat",
          data: { cat: element, game_id: this.$store.state.game.id }
        };
        this.$store.dispatch("sendMessage", obj);
      });
      let obj = {
        action: "start_game",
        data: { game_id: this.$store.state.game.id }
      };
      this.$store.dispatch("sendMessage", obj);
    }
  }
};
</script>
