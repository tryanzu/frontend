import Jed from 'jed'

export const i18n = new Jed({ 
    locale_data: {

        // This is the domain key
        messages: {
            '': {
                // Domain name
                domain: 'messages',

                // Language code
                "lang" : "es",

                // Plural form function for language
                'plural_forms': 'nplurals=2; plural=(n != 1);'
            }
        }
    },
    domain: 'messages'
 })

 export function t(str, ...values) {
     return i18n.translate(String.raw(str, ...values)).fetch()
 }