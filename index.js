/*
vr.maunium.net - A collection of sorted VR-related research papers.
Copyright (C) 2016 Tulir Asokan

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* global $ Handlebars */

const templates = {
	paper: Handlebars.compile($("#paper").html()),
}
let papers = []

$.ajax({
	type: "GET",
	url: "data.json",
	dataType: "json",
})
.done(data => {
	for (const paper of data) {
		paper.mainAuthor = paper.authors[0]
		paper.manyAuthors = paper.authors.length > 1
		paper.tooManyAuthors = paper.authors.length > 3
		paper.cacheFormat = paper.cacheFormat || "pdf"
		paper.author = paper.mainAuthor + (paper.manyAuthors ? " et al" : "")
		if (paper.abstract.length > 200) {
			paper.shortAbstract = paper.abstract.substr(0, 200)
		}
	}
	papers = data
	window.onhashchange()
})

function activateHiddenLinks() {
	console.log("################################################")
	console.log("# Enabling links to cached files in 5 seconds. #")
	console.log("################################################")
	console.log("Once  the activation  is complete,  the cached  links will  be")
	console.log("available  behind the  'Open cached full text' button. Not all")
	console.log("papers have cached versions.")
	console.log()
	console.log("Please note that the cached files MUST NOT be used for any non-")
	console.log("personal purposes regardless  of what the original license may")
	console.log("allow.")
	console.log()
	console.log("Sharing the links or the method to view the links to any files")
	console.log("in this cache is NOT permitted.")
	console.log()
	console.log("Download the file from  the live version if you wish to use it")
	console.log("for something other than personal purposes.")

	setTimeout(() => {
		for (const paper of papers) {
			paper.allowCachedPDFLink = true
			if (paper.noCachedLink) {
				continue
			}
			paper.cachedPDFLinkName = encodeURIComponent(paper.title.replace(/:/g, ";"))
		}
		window.onhashchange()
		console.log("Cached PDF links activated.")
	}, 5000)
}

$("#search").keyup(() => {
	if (!$("#search-instant").prop("checked")) {
		return
	}
	window.location.hash = `#${encodeURIComponent($("#search").val())}`
})

$("#search").keydown(event => {
	if (event.keyCode === 13) {
		window.location.hash = `#${encodeURIComponent($("#search").val())}`
	}
})

function search(initialQuery) {
	const title = $("#search-title").prop("checked")
	const tags = $("#search-tags").prop("checked")
	const authors = $("#search-authors").prop("checked")
	const language = $("#search-language").prop("checked")
	const release = $("#search-release").prop("checked")
	const abstract = $("#search-abstract").prop("checked")
	const sectNames = ["title", "tags", "authors", "language", "release", "abstract"]

	if (initialQuery.length === 0) {
		window.location.hash = "#"
		return
	}

	const query = []
	let compilingWord = ""
	let compilingSect = ""
	let inQuotes = false

	const pushCompiled = () => {
		if (compilingWord.length === 0) {
			return
		}
		if (compilingSect.includes(",")) {
			compilingSect = compilingSect.split(",")
		} else if (compilingSect.length > 0) {
			compilingSect = [compilingSect]
		} else {
			compilingSect = []
		}
		const part = {
			word: compilingWord,
			sections: compilingSect,
			searchIn: { title, tags, authors, language, release, abstract },
		}
		compilingWord = ""
		compilingSect = ""

		if (part.sections.length > 0) {
			part.searchIn = {}
			for (const sect of part.sections) {
				for (const sectName of sectNames) {
					part.searchIn[sectName] = sectName.startsWith(sect)
				}
			}
		}
		query.push(part)
	}
	for (const char of initialQuery) {
		// && compilingWord.match(/([\\]+)$/)[0].length % 2 === 1
		if (compilingWord.endsWith("\\")) {
			compilingWord = compilingWord.substr(0, compilingWord.length - 1) + char
		} else if (char === ":") {
			compilingSect = compilingWord
			compilingWord = ""
		} else if (char === "\"") {
			if (inQuotes) {
				inQuotes = false
			} else {
				inQuotes = true
			}
		} else if (char === " " && !inQuotes) {
			pushCompiled()
		} else {
			compilingWord += char
		}
	}
	pushCompiled()

	$("#data").empty()

	// Loop through all papers, rendering those that contain all the parts of
	// the search query.
	PaperLoop: for (const paper of papers) {
		PartLoop: for (const part of query) {
			// Check appropriate places for a match of this query part.
			// If found, move on to the next part: `continue PartLoop`
			// If not found, move on to the next paper: `continue PaperLoop`
			// If all parts are found (the loop ends), render the paper: `renderPaper(paper)`

			if (part.searchIn.title && paper.title.toLowerCase().includes(part.word)) {
				continue
			}

			if (part.searchIn.tags) {
				for (const tag of paper.tags) {
					if (tag.toLowerCase().includes(part.word)) {
						continue PartLoop
					}
				}
			}

			if (part.searchIn.authors) {
				for (const author of paper.authors) {
					if (author.toLowerCase().includes(part.word)) {
						continue PartLoop
					}
				}
			}

			if (part.searchIn.language && paper.language.toLowerCase().includes(part.word)) {
				continue
			}

			if (part.searchIn.release && paper.release.toString().includes(part.word)) {
				continue
			}

			if (part.searchIn.abstract && paper.abstract.toLowerCase().includes(part.word)) {
				continue
			}

			// No matches found for this part -> ignore this paper.
			continue PaperLoop
		}
		// Part loop ended -> all parts found in paper -> render paper.
		renderPaper(paper)
	}
}

function toggleFullView(obj) {
	const text = obj.parent().parent()
	const hidden = text.children(".hidden")
	const notHidden = text.children(":not(.hidden)")
	hidden.removeClass("hidden")
	notHidden.addClass("hidden")
}

function renderPaper(paper) {
	$("#data").append(templates.paper(paper))
}

function openAll() {
	$("#data").empty()
	for (const paper of papers) {
		renderPaper(paper)
	}
}

function addToSearchQuery(key, value) {
	let query = $("#search").val()
	if (query.length > 0 && !query.endsWith(" ")) {
		query += " "
	}
	query += value.includes(" ") ? `${key}:"${value}"` : `${key}:${value}`

	$("#search").val(query)
	window.location.hash = `#${encodeURIComponent(query)}`
}

window.onhashchange = function() {
	if (window.location.hash.length > 1) {
		const query = decodeURIComponent(window.location.hash.substr(1))
		if ($("#search").val().length === 0) {
			$("#search").val(query)
		}
		search(query.toLowerCase())
	} else {
		$("#search").val("")
		openAll()
	}
}
