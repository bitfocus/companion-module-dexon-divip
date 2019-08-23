var tcp           = require('../../tcp');
var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions
	self.init_presets();

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;
	self.init_presets();

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	self.config = config;
    self.init_tcp();
};

instance.prototype.init = function() {
	var self = this;

    debug = self.debug;
    log = self.log;

	self.init_presets();
	self.init_tcp();
};

instance.prototype.init_tcp = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
		delete self.socket;
	}

	self.status(self.STATE_WARNING, 'Connecting');

	if (self.config.host) {
		self.socket = new tcp(self.config.host, self.config.port);

		self.socket.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.socket.on('error', function (err) {
			debug("Network error", err);
			self.status(self.STATE_ERROR, err);
			self.log('error',"Network error: " + err.message);
		});

		self.socket.on('connect', function () {
			self.status(self.STATE_OK);
			debug("Connected");
		})

		self.socket.on('data', function (data) {});
	}
};


// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;

	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 4,
			regex: self.REGEX_IP
        },
        {
			type: 'textinput',
			id: 'port',
			label: 'Target Port',
			width: 2,
			default: 6464,
			regex: self.REGEX_PORT
        },
        {
			type: 'text',
			id: 'info',
			label: 'Information',
			width: 12,
			value: 'Please type in your user credentials:'
		},
		{
			type: 'textinput',
			id: 'user',
			label: 'Username',
			width: 4,
			default: 'Administrator'
        },
		{
			type: 'textinput',
			id: 'pass',
			label: 'Password',
			width: 4,
			default: ''
        }

    ]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.socket !== undefined) {
		self.socket.destroy();
	}

	debug("destroy", self.id);;
};

instance.prototype.init_presets = function () {
	var self = this;
	var presets = [];

    presets.push({
		category: 'Login',
		label: 'Login',
		bank: {
			style: 'text',
			text: 'Login',
			size: '18',
			color: '16777215',
			bgcolor: self.rgb(0,204,0)
		},
		actions: [
			{
				action: 'login',
			}
		]
	});

	self.setPresetDefinitions(presets);
}


instance.prototype.actions = function(system) {
	var self = this;

	self.system.emit('instance_actions', self.id, {

        'login':      {
			label: 'Login',
			options: [{
				type: 'text',
				id: 'info_login',
				width: 12,
				label: 'Information',
				value: 'Please setup username and password in the config tab.'
			}]
		},

		'recall_layout':      {
			label: 'Recall Layout',
			options: [
				{
					type: 'number',
					id: 'recall_id',
					label: 'Recall Layout ID:',
					min: 1,
					max: 256,
					default: 1,
					required: true,
					range: false,
					regex: self.REGEX_NUMBER
				},
				{
					type: 'dropdown',
					id: 'recall_advance',
					label: 'Advance:',
					default: 'No',
					choices: [
					  { id: 'Yes', label: 'Yes' },
					  { id: 'No', label: 'No' },
					]
				},
				{
					type: 'dropdown',
					id: 'recall_ack',
					label: 'Need ACK:',
					default: 'No',
					choices: [
					  { id: 'Yes', label: 'Yes' },
					  { id: 'No', label: 'No' },
					]
				}
			]
		},
		
		'switch_audio':      {
			label: 'Switch Audio',
			options: [
				{
					type: 'number',
					id: 'switch_input_id',
					label: 'Input ID:',
					min: 1,
					max: 256,
					default: 1,
					required: true,
					range: false,
					regex: self.REGEX_NUMBER
				},
				{
					type: 'number',
					id: 'switch_output_id',
					label: 'Output ID:',
					min: 1,
					max: 256,
					default: 1,
					required: true,
					range: false,
					regex: self.REGEX_NUMBER
				}
			]
		},
    });
}

instance.prototype.action = function(action) {
	var self = this;
	var cmd
	var opt = action.options

	switch(action.action) {
        
        case 'login':
			cmd = '<setup version="1" > <username>' + self.config.user + '</username> <password>' + self.config.pass + '</password> <needack>Yes</needack> </setup>';
            break;

		case 'recall_layout':
			cmd = '<recall_layout id="' + action.options.recall_id + '" advance="' + action.options.recall_advance + '" needack="' + action.options.recall_ack + '"/>';
			break;

		case 'switch_audio':
			cmd = '<audio><connect input_id="' + action.options.switch_input_id + '" output_id="' + action.options.switch_output_id + '"/></audio>';
			break;

	}

    if (cmd !== undefined) {

        debug('sending ',cmd,"to",self.config.host);

        if (self.socket !== undefined && self.socket.connected) {
            self.socket.send(cmd);
        }
        else {
            debug('Socket not connected :(');
        }
    }
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;
