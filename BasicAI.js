var attack_mode=true

var ready = false;

const MAX_PARTY = 3;

var CURRENT_CHAR;
var CURRENT_ACTION;

const ROLE = Object.freeze({
    DEFAULT: 0,
    CAPTAIN: 1,
    CARRY: 2,
    HEALER: 3
});

const DIRECTION = Object.freeze({
    DOWN: 0,
    LEFT: 1,
    RIGHT: 2,
    UP: 3
});

const ACTION_STATUS = Object.freeze({
    DEFAULT: 0,
    PERFORM_ROLE: 1,
    ATTACK_ON_SIGHT: 2,
	TRAVELLING: 3
});

var chars = [{
    name: "Jacqueline",
    role: ROLE.CAPTAIN
  },
			 {
    name: "Kevinott",
    role: ROLE.CARRY
  },
  {
    name: "Kylaa",
    role: ROLE.HEALER
  }
]

function setCurrentCharacter() {
	for (var i = 0; i < chars.length; i++) {
		if (character.name == chars[i].name) {
			CURRENT_CHAR = i;
			return;
		}
	}
}

function loadTeam() {
	if (CURRENT_CHAR == 0) { // Is Captain
		var characters = get_active_characters()
		for (var i = 1; i < chars.length; i++) {
			if(!characters[chars[i].name]) {
				start_character(chars[i].name, 2);
			}
		}
	}
}

function char_init() {
	setCurrentCharacter();
	
	if (CURRENT_CHAR == 0) { // Is Captain
		loadTeam();
		inviteTeam(); // Invite team
	} else if (parent.party_list.length == 0) {
		joinCaptain();
	}

	ready = true;
}

char_init();

function inviteTeam() {
	if (CURRENT_CHAR == 0) { // Is Captain
		for (var i = 1; i < chars.length; i++) {
			if (get_player(chars[i].name) != null) {
				send_party_invite(chars[i].name);
			}
		}
	}
}

function joinCaptain() {
	if (get_player(chars[0].name) != null) {
		send_party_request(chars[0].name);
	}
}

function follow_character(name) {
	var chara = get_player(name);
	
	if (!character.moving && chara != null) {
		set_message("Following");

		CURRENT_ACTION = ACTION_STATUS.TRAVELLING;

		var x = chara.real_x;
		var y = chara.real_y;
		switch (chara.direction) {
			case DIRECTION.DOWN:
				y -= 21 * CURRENT_CHAR;
				break;
			case DIRECTION.LEFT:
				x += 21 * CURRENT_CHAR;
				break;
			case DIRECTION.RIGHT:
				x -= 21 * CURRENT_CHAR;
				break;
			case DIRECTION.UP:
				y += 21 * CURRENT_CHAR;
				break;
		}
		character.direction = chara.direction;
		move(x, y);
	}
}

function follow_leader() {
	follow_character(parent.party_list[0]);
}

function on_party_request(name) {
	// Send party invite to only known members
	for (var i = 1; i < chars.length; i++) {
		if (name == chars[i].name) {
			accept_party_request(name);
		}
	}
}

function on_party_invite(name) {
	// We only accept party's captain
	if (name == chars[0].name) {
		accept_party_invite(name);
	}
}

function attack_on_sight() {
	if(!attack_mode || character.rip || is_moving(character)) return;

	CURRENT_ACTION = ACTION_STATUS.ATTACK_ON_SIGHT;

	var target=get_targeted_monster();
	if(!target)
	{
		target=get_nearest_monster({min_xp:100,max_att:120});
		if(target) change_target(target);
		else
		{
			set_message("No Monsters");
			return;
		}
	}
	
	if(!in_attack_range(target))
	{
		move(
			character.real_x+(target.real_x-character.real_x)/2,
			character.real_y+(target.real_y-character.real_y)/2
			);
		// Walk half the distance
	}
	else if(can_attack(target))
	{
		set_message("Attacking");
		attack(target);
	}
}

function assist_attack() {
	var target;

	var leader = get_player(chars[0].name);
	if (leader != null) {
		var id = leader.target
		target = parent.entities[id];

		if (target != null) {
			if(!in_attack_range(target))
			{
				move(
					character.real_x+(target.real_x-character.real_x)/2,
					character.real_y+(target.real_y-character.real_y)/2
					);
				// Walk half the distance
			}
			else if(can_attack(target))
			{
				set_message("Attacking");
				attack(target);
			}
		}
	}
}

function heal_team() {
	var target;
	var lowest = 9999;
	for (var i = 0; i < parent.party_list.length; i++) {
		var member = get_player(parent.party_list[i]);
		if (member != null && !member.rip && member.hp < member.max_hp) {
			var difference = member.max_hp - member.hp;
			if (difference > 80 && difference < lowest) {
				lowest = difference;
				if (target == null || target.max_hp - target.hp > difference) {
					target = member;
				}
			}
		}
	}

	if (target != null) {
		set_message("Healing");
		heal(target);
	}
}

setInterval(function(){
	if (!ready) {
		return;
	}
	
	if (character.rip) {
		var notification = new Notification(character.name + " died");
	}
	
	if (character.hp < 50 || character.mp < 50) {
		use_hp_or_mp();
	}
	
	loot();

	if (parent.party_list.length != 0) {
		switch (chars[CURRENT_CHAR].role) {
			case ROLE.DEFAULT:
			break;

			case ROLE.CAPTAIN:
				attack_on_sight();
			break;

			case ROLE.CARRY:
				assist_attack();
				follow_leader();
			break;

			case ROLE.HEALER:
				heal_team()
				assist_attack();
				follow_leader();
			break;
		}
	}
	else {

	}

}, 100);

setInterval(function(){
	if (!ready && CURRENT_CHAR != 0) {
		return;
	}

	if (parent.party_list.length < MAX_PARTY) {
		inviteTeam();
	}
}, 10000); 