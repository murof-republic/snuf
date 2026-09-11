const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const colors = require('../../services/colors');

async function moveColorRolesToBottom(guild) {
	const colorNames = new Set(
		colors.map(color => color.name.toLowerCase())
	);

	const colorRoles = guild.roles.cache
		.filter(role => colorNames.has(role.name.toLowerCase()) && role.editable)
		.sort((firstRole, secondRole) => secondRole.position - firstRole.position);

	for (const role of colorRoles.values()) {
		try {
			await role.setPosition(1, 'Manter cargos de cor no final da lista');
		} catch (error) {
			console.error(`Não foi possível mover o cargo de cor ${role.name}:`, error.message);
		}
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cor')
		.setDescription('Escolha uma cor para o seu cargo.')
		.addStringOption(option =>
			option
				.setName('cor')
				.setDescription('Escolha uma cor.')
				.setRequired(true)
				.setAutocomplete(true)
		),

	async autocomplete(interaction) {
		if (interaction.responded) return;

		const input = interaction.options.getString('cor', true).toLowerCase();

		const results = colors
			.filter(color =>
				color.name.toLowerCase().includes(input)
			)
			.slice(0, 25);

		try {
			await interaction.respond(
				results.map(color => ({
					name: color.name,
					value: color.name
				}))
			);
		} catch (error) {
			if (error.code !== 40060) {
				console.error('Erro no autocomplete:', error);
			}
		}
	},

	async execute(interaction) {
		const colorName = interaction.options.getString('cor', true);

		const color = colors.find(
			color =>
				color.name.toLowerCase() === colorName.toLowerCase()
		);

		if (!color) {
			return interaction.reply({
				content: 'Essa cor não está disponível.',
				flags: MessageFlags.Ephemeral
			});
		}

		const member = interaction.member;
		const guild = interaction.guild;

		try {
			const colorNames = new Set(
				colors.map(color => color.name.toLowerCase())
			);

			const oldColorRoles = member.roles.cache.filter(role =>
				colorNames.has(role.name.toLowerCase())
			);

			if (oldColorRoles.size > 0) {
				await member.roles.remove(oldColorRoles);
			}

			let role = guild.roles.cache.find(
				role =>
					role.name.toLowerCase() === color.name.toLowerCase()
			);

			if (!role) {
				role = await guild.roles.create({
					name: color.name,
					colors: {
						primaryColor: color.hex
					},
					reason: 'Cargo de cor do usuário'
				});
			}

			await moveColorRolesToBottom(guild);

			await member.roles.add(role);

			await interaction.reply({
				content: 'Prontinho! Sua cor foi alterada.',
				flags: MessageFlags.Ephemeral
			});

		} catch (error) {
			console.error('Erro ao alterar cor:', error);

			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: 'Não consegui alterar sua cor. Verifique as permissões do bot.',
					flags: MessageFlags.Ephemeral
				});
			}
		}
	}
};