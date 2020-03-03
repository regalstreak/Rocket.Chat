import mem from 'mem';
import s from 'underscore.string';
import { Accounts } from 'meteor/accounts-base';
import { HTML } from 'meteor/htmljs';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Tracker } from 'meteor/tracker';

import { KonchatNotification } from '../app/ui';
import { ChatSubscription } from '../app/models';
import { roomTypes } from '../app/utils';
import { call } from '../app/ui-utils';
import { renderComponentIntoLayout } from './lib/renderComponentIntoLayout';

const getRoomById = mem((rid) => call('getRoomById', rid));

FlowRouter.goToRoomById = async (rid) => {
	if (!rid) {
		return;
	}
	const subscription = ChatSubscription.findOne({ rid });
	if (subscription) {
		return roomTypes.openRouteLink(subscription.t, subscription, FlowRouter.current().queryParams);
	}

	const room = await getRoomById(rid);
	return roomTypes.openRouteLink(room.t, room, FlowRouter.current().queryParams);
};


BlazeLayout.setRoot('body');

FlowRouter.route('/', {
	name: 'index',
	action() {
		BlazeLayout.render('main', { center: 'loading' });
		if (!Meteor.userId()) {
			return FlowRouter.go('home');
		}

		Tracker.autorun(function(c) {
			if (FlowRouter.subsReady() === true) {
				Meteor.defer(function() {
					if (Meteor.user() && Meteor.user().defaultRoom) {
						const room = Meteor.user().defaultRoom.split('/');
						FlowRouter.go(room[0], { name: room[1] }, FlowRouter.current().queryParams);
					} else {
						FlowRouter.go('home');
					}
				});
				c.stop();
			}
		});
	},
});

FlowRouter.route('/home', {
	name: 'home',

	action(params, queryParams) {
		KonchatNotification.getDesktopPermission();
		if (queryParams.saml_idp_credentialToken !== undefined) {
			Accounts.callLoginMethod({
				methodArguments: [{
					saml: true,
					credentialToken: queryParams.saml_idp_credentialToken,
				}],
				userCallback() { BlazeLayout.render('main', { center: 'home' }); },
			});
		} else {
			BlazeLayout.render('main', { center: 'home' });
		}
	},
});

FlowRouter.route('/directory', {
	name: 'directory',

	action() {
		BlazeLayout.render('main', { center: 'directory' });
	},
	triggersExit: [function() {
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/account/:group?', {
	name: 'account',

	action(params) {
		if (!params.group) {
			params.group = 'Preferences';
		}
		params.group = s.capitalize(params.group, true);
		BlazeLayout.render('main', { center: `account${ params.group }` });
	},
	triggersExit: [function() {
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/terms-of-service', {
	name: 'terms-of-service',
	action: () => {
		Session.set('cmsPage', 'Layout_Terms_of_Service');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/privacy-policy', {
	name: 'privacy-policy',
	action: () => {
		Session.set('cmsPage', 'Layout_Privacy_Policy');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/legal-notice', {
	name: 'legal-notice',
	action: () => {
		Session.set('cmsPage', 'Layout_Legal_Notice');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/room-not-found/:type/:name', {
	name: 'room-not-found',
	action: (params) => {
		Session.set('roomNotFound', { type: params.type, name: params.name });
		BlazeLayout.render('main', { center: 'roomNotFound' });
	},
});

FlowRouter.route('/register/:hash', {
	name: 'register-secret-url',
	action: () => {
		BlazeLayout.render('secretURL');
	},
});

FlowRouter.route('/invite/:hash', {
	name: 'invite',
	action: () => {
		BlazeLayout.render('invite');
	},
});

FlowRouter.route('/setup-wizard/:step?', {
	name: 'setup-wizard',
	action: () => {
		renderComponentIntoLayout('SetupWizardRoute', async () => {
			const { SetupWizardRoute } = await import('./components/setupWizard/SetupWizardRoute');
			return SetupWizardRoute;
		});
	},
});

FlowRouter.route('/admin/:group?', {
	name: 'admin',
	action: ({ group = 'info' } = {}) => {
		const style = 'overflow: hidden; flex: 1 1 auto; height: 1%;';

		switch (group) {
			case 'info': {
				renderComponentIntoLayout('InformationRoute', async () => {
					const { InformationRoute } = await import('./components/admin/info/InformationRoute');
					return InformationRoute;
				}, {
					layoutName: 'main',
					regions: { center: 'InformationRoute' },
					renderContainerView: () => HTML.DIV.call(null, { style }),
				});
				break;
			}

			default: {
				renderComponentIntoLayout('SettingsRoute', async () => {
					const { SettingsRoute } = await import('./components/admin/settings/SettingsRoute');
					return SettingsRoute;
				}, {
					layoutName: 'main',
					regions: { center: 'SettingsRoute' },
					renderContainerView: () => HTML.DIV.call(null, { style }),
				});
			}
		}
	},
});

FlowRouter.notFound = {
	action: () => {},
};
